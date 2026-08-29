import { Theme } from '../models/Theme.js';
import { ThemeLayout } from '../models/ThemeLayout.js';
import { ThemeComponent } from '../models/ThemeComponent.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ThemeEngineService {
  async createTheme(data) {
    const theme = await Theme.create(data);
    await logAuditEvent({
      action: 'theme.create', category: 'system',
      entityType: 'Theme', entityId: theme._id,
      newValue: { name: theme.name, code: theme.code, type: theme.type },
      description: `Theme "${theme.name}" created`,
    });
    return theme;
  }

  async updateTheme(id, data) {
    const theme = await Theme.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!theme) throw new Error('Theme not found');
    await logAuditEvent({
      action: 'theme.update', category: 'system',
      entityType: 'Theme', entityId: id,
      newValue: data,
      description: `Theme "${theme.name}" updated`,
    });
    return theme;
  }

  async getTheme(id) {
    const theme = await Theme.findById(id).lean();
    if (!theme) throw new Error('Theme not found');
    const [layouts, components] = await Promise.all([
      ThemeLayout.find({ theme: id }).sort({ type: 1, name: 1 }).lean(),
      ThemeComponent.find({ theme: id }).sort({ componentType: 1, name: 1 }).lean(),
    ]);
    return { ...theme, layouts, components };
  }

  async listThemes(filter = {}) {
    const { page = 1, limit = 20, type, isActive, search } = filter;
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Theme.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Theme.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async deleteTheme(id) {
    const theme = await Theme.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!theme) throw new Error('Theme not found');
    await logAuditEvent({
      action: 'theme.delete', category: 'system',
      entityType: 'Theme', entityId: id,
      oldValue: { name: theme.name, code: theme.code },
      description: `Theme "${theme.name}" soft deleted`,
    });
    return { message: 'Theme deleted' };
  }

  async duplicateTheme(id) {
    const source = await Theme.findById(id).lean();
    if (!source) throw new Error('Theme not found');
    const { _id, createdAt, updatedAt, isDefault, ...data } = source;
    data.name = `${data.name} (Copy)`;
    data.code = `${data.code}_copy_${Date.now()}`;
    data.isDefault = false;
    const theme = await Theme.create(data);
    const [layouts, components] = await Promise.all([
      ThemeLayout.find({ theme: id }).lean(),
      ThemeComponent.find({ theme: id }).lean(),
    ]);
    if (layouts.length > 0) {
      await ThemeLayout.insertMany(layouts.map(l => {
        const { _id: lid, createdAt: lc, updatedAt: lu, ...rest } = l;
        return { ...rest, theme: theme._id, isDefault: false };
      }));
    }
    if (components.length > 0) {
      await ThemeComponent.insertMany(components.map(c => {
        const { _id: cid, createdAt: cc, updatedAt: cu, ...rest } = c;
        return { ...rest, theme: theme._id, isDefault: false };
      }));
    }
    await logAuditEvent({
      action: 'theme.duplicate', category: 'system',
      entityType: 'Theme', entityId: theme._id,
      newValue: { name: theme.name, sourceId: id },
      description: `Theme "${source.name}" duplicated as "${theme.name}"`,
    });
    return theme;
  }

  async exportTheme(id) {
    const theme = await Theme.findById(id).lean();
    if (!theme) throw new Error('Theme not found');
    const [layouts, components] = await Promise.all([
      ThemeLayout.find({ theme: id }).lean(),
      ThemeComponent.find({ theme: id }).lean(),
    ]);
    const { _id, createdAt, updatedAt, ...exportData } = theme;
    return {
      ...exportData,
      layouts: layouts.map(({ _id, createdAt, updatedAt, ...l }) => l),
      components: components.map(({ _id, createdAt, updatedAt, ...c }) => c),
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
    };
  }

  async importTheme(data) {
    const { layouts = [], components = [], ...themeData } = data;
    const theme = await Theme.create({
      ...themeData,
      code: themeData.code || `imported_${Date.now()}`,
    });
    if (layouts.length > 0) {
      await ThemeLayout.insertMany(layouts.map(l => ({ ...l, theme: theme._id })));
    }
    if (components.length > 0) {
      await ThemeComponent.insertMany(components.map(c => ({ ...c, theme: theme._id })));
    }
    await logAuditEvent({
      action: 'theme.import', category: 'system',
      entityType: 'Theme', entityId: theme._id,
      newValue: { name: theme.name, code: theme.code, layouts: layouts.length, components: components.length },
      description: `Theme "${theme.name}" imported`,
    });
    return theme;
  }

  async createLayout(themeId, layoutData) {
    const layout = await ThemeLayout.create({ ...layoutData, theme: themeId });
    await logAuditEvent({
      action: 'theme.layout.create', category: 'system',
      entityType: 'ThemeLayout', entityId: layout._id,
      newValue: { name: layout.name, theme: themeId, type: layout.type },
      description: `Layout "${layout.name}" created for theme ${themeId}`,
    });
    return layout;
  }

  async updateLayout(id, data) {
    const layout = await ThemeLayout.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!layout) throw new Error('Layout not found');
    return layout;
  }

  async listLayouts(themeId) {
    return ThemeLayout.find({ theme: themeId }).sort({ type: 1, order: 1 }).lean();
  }

  async createComponent(themeId, componentData) {
    const component = await ThemeComponent.create({ ...componentData, theme: themeId });
    await logAuditEvent({
      action: 'theme.component.create', category: 'system',
      entityType: 'ThemeComponent', entityId: component._id,
      newValue: { name: component.name, theme: themeId, componentType: component.componentType },
      description: `Component "${component.name}" created for theme ${themeId}`,
    });
    return component;
  }

  async updateComponent(id, data) {
    const component = await ThemeComponent.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!component) throw new Error('Component not found');
    return component;
  }

  async listComponents(themeId, componentType) {
    const filter = { theme: themeId };
    if (componentType) filter.componentType = componentType;
    return ThemeComponent.find(filter).sort({ componentType: 1, name: 1 }).lean();
  }

  async generateThemeCSS(themeId) {
    const theme = await Theme.findById(themeId).lean();
    if (!theme) throw new Error('Theme not found');
    const vars = [];
    if (theme.variables) {
      for (const [key, val] of theme.variables) {
        vars.push(`--${key}: ${val};`);
      }
    }
    if (theme.layout) {
      for (const [section, config] of Object.entries(theme.layout)) {
        if (config && typeof config === 'object') {
          for (const [prop, val] of Object.entries(config)) {
            if (typeof val === 'string' || typeof val === 'number') {
              vars.push(`--layout-${section}-${prop}: ${val};`);
            }
          }
        }
      }
    }
    if (theme.components) {
      for (const [comp, config] of Object.entries(theme.components)) {
        if (config && typeof config === 'object') {
          for (const [prop, val] of Object.entries(config)) {
            if (typeof val === 'string' || typeof val === 'number') {
              vars.push(`--component-${comp}-${prop}: ${val};`);
            }
          }
        }
      }
    }
    return `:root {\n  ${vars.join('\n  ')}\n}`;
  }

  async previewTheme(themeId) {
    const theme = await Theme.findById(themeId).lean();
    if (!theme) throw new Error('Theme not found');
    const layouts = await ThemeLayout.find({ theme: themeId, isDefault: true }).lean();
    const components = await ThemeComponent.find({ theme: themeId, isDefault: true }).lean();
    const css = await this.generateThemeCSS(themeId);
    return {
      theme: { name: theme.name, type: theme.type, code: theme.code },
      layouts,
      components,
      css,
      previewUrl: null,
    };
  }

  async setActiveTheme(themeId) {
    await Theme.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    const theme = await Theme.findByIdAndUpdate(themeId, { $set: { isDefault: true, isActive: true } }, { new: true });
    if (!theme) throw new Error('Theme not found');
    await logAuditEvent({
      action: 'theme.set_active', category: 'system',
      entityType: 'Theme', entityId: themeId,
      newValue: { name: theme.name },
      description: `Theme "${theme.name}" set as active`,
    });
    return theme;
  }

  async getActiveTheme() {
    const theme = await Theme.findOne({ isDefault: true, isActive: true }).lean();
    if (!theme) return null;
    const [layouts, components] = await Promise.all([
      ThemeLayout.find({ theme: theme._id }).sort({ type: 1, order: 1 }).lean(),
      ThemeComponent.find({ theme: theme._id }).sort({ componentType: 1, name: 1 }).lean(),
    ]);
    return { ...theme, layouts, components };
  }

  async compileTheme(themeId) {
    const theme = await Theme.findById(themeId).lean();
    if (!theme) throw new Error('Theme not found');
    const [layouts, components] = await Promise.all([
      ThemeLayout.find({ theme: themeId }).sort({ order: 1 }).lean(),
      ThemeComponent.find({ theme: themeId }).sort({ componentType: 1, name: 1 }).lean(),
    ]);
    const css = await this.generateThemeCSS(themeId);
    return {
      name: theme.name,
      code: theme.code,
      type: theme.type,
      css,
      layoutConfig: layouts.reduce((acc, l) => {
        acc[l.type] = { name: l.name, sections: l.sections, widgets: l.widgets, css: l.css };
        return acc;
      }, {}),
      componentConfig: components.reduce((acc, c) => {
        if (!acc[c.componentType]) acc[c.componentType] = [];
        acc[c.componentType].push({ name: c.name, props: c.props, styles: c.styles, variants: c.variants });
        return acc;
      }, {}),
      responsive: theme.responsive,
      rtl: theme.rtl,
      compiledAt: new Date().toISOString(),
    };
  }
}

export const themeEngineService = new ThemeEngineService();
