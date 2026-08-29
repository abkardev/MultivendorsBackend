import mongoose from 'mongoose';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { Order } from '../models/orderModel.js';
import { logAuditEvent } from '../services/auditService.js';

class ScenarioSimulationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  async simulate(params) {
    const { type, currentData, adjustments } = params;

    let result;

    switch (type) {
      case 'change_supplier':
        result = await this.simulateChangeSupplier(currentData, adjustments);
        break;
      case 'split_orders':
        result = this.simulateSplitOrders(currentData, adjustments);
        break;
      case 'use_local_supplier':
        result = await this.simulateUseLocalSupplier(currentData, adjustments);
        break;
      case 'increase_moq':
        result = this.simulateIncreaseMOQ(currentData, adjustments);
        break;
      case 'delay_purchase':
        result = this.simulateDelayPurchase(currentData, adjustments);
        break;
      case 'change_country':
        result = await this.simulateChangeCountry(currentData, adjustments);
        break;
      case 'increase_budget':
        result = this.simulateBudgetChange(currentData, adjustments, 'increase');
        break;
      case 'reduce_budget':
        result = this.simulateBudgetChange(currentData, adjustments, 'reduce');
        break;
      case 'use_export_supplier':
        result = await this.simulateUseExportSupplier(currentData, adjustments);
        break;
      case 'advance_purchase':
        result = this.simulateAdvancePurchase(currentData, adjustments);
        break;
      default:
        result = this.simulateGeneric(currentData, adjustments);
    }

    await logAuditEvent({
      userId: currentData?.userId || 'system',
      action: 'run_scenario_simulation',
      category: 'executive',
      entityType: 'ScenarioSimulation',
      entityId: `${type}_${Date.now()}`,
      description: `Scenario simulation: ${type}`,
      status: 'success',
    });

    return result;
  }

  async simulateChangeSupplier(currentData, adjustments) {
    const currentVendorId = currentData?.vendorId;
    const newVendorId = adjustments?.vendorId;

    const [currentVendor, newVendor, avgOrderValue] = await Promise.all([
      currentVendorId ? Vendor.findById(currentVendorId).lean() : null,
      newVendorId ? Vendor.findById(newVendorId).lean() : null,
      this.getAverageOrderValue(currentData),
    ]);

    const currentCost = currentData?.orderTotal || avgOrderValue || 100000;
    const currentRisk = currentVendor ? this.calcVendorRiskScore(currentVendor) : 50;
    const currentDelivery = currentVendor ? 70 : 50;

    const newCost = newVendor
      ? this.estimateNewVendorCost(currentCost, currentVendor, newVendor)
      : currentCost * 0.95;
    const newRisk = newVendor ? this.calcVendorRiskScore(newVendor) : 40;
    const newDelivery = newVendor ? 80 : 65;

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, currentDelivery, newDelivery, {
      recommendation: newRisk < currentRisk
        ? `Switching supplier could reduce risk and potentially lower costs`
        : `New supplier offers different risk profile - review carefully before switching`,
    });
  }

  simulateSplitOrders(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const currentRisk = currentData?.risk || 50;
    const currentDelivery = currentData?.delivery || 80;

    const splitCount = adjustments?.splitCount || 2;
    const logisticsCostIncrease = 0.05;
    const riskReduction = 0.20;
    const deliveryImprovement = 0.05;

    const newCost = currentCost * (1 + logisticsCostIncrease);
    const newRisk = currentRisk * (1 - riskReduction);
    const newDelivery = Math.min(100, currentDelivery * (1 + deliveryImprovement));

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, currentDelivery, newDelivery, {
      recommendation: `Splitting into ${splitCount} orders reduces risk by ${Math.round(riskReduction * 100)}% but adds ${Math.round(logisticsCostIncrease * 100)}% in logistics costs`,
      splitCount,
    });
  }

  async simulateUseLocalSupplier(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const currentRisk = 50;
    const currentDelivery = 80;

    const costReduction = 0.10;
    const riskReduction = 0.15;
    const deliveryImprovement = 0.15;

    const newCost = currentCost * (1 - costReduction);
    const newRisk = currentRisk * (1 - riskReduction);
    const newDelivery = Math.min(100, currentDelivery * (1 + deliveryImprovement));

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, currentDelivery, newDelivery, {
      recommendation: `Switching to local supplier could reduce costs by ${Math.round(costReduction * 100)}% and improve delivery by ${Math.round(deliveryImprovement * 100)}%`,
      localSupplierAvailable: true,
    });
  }

  simulateIncreaseMOQ(currentData, adjustments) {
    const currentMOQ = currentData?.moq || 100;
    const currentQuantity = currentData?.quantity || currentMOQ;
    const currentUnitPrice = currentData?.orderTotal
      ? currentData.orderTotal / currentQuantity
      : 1000;
    const currentCost = currentData?.orderTotal || (currentUnitPrice * currentQuantity);

    const newMOQ = adjustments?.newMOQ || currentMOQ * 2;
    const unitCostReduction = 0.15;
    const newUnitPrice = currentUnitPrice * (1 - unitCostReduction);
    const newQuantity = Math.max(newMOQ, currentQuantity);
    const newCost = newUnitPrice * newQuantity;

    const currentRisk = 50;
    const newRisk = newQuantity > currentQuantity * 1.5 ? currentRisk * 1.2 : currentRisk;

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, 80, 80, {
      recommendation: `Increasing MOQ from ${currentMOQ} to ${newMOQ} reduces unit cost by ${Math.round(unitCostReduction * 100)}% but increases total commitment`,
      unitPriceChange: Math.round((newUnitPrice - currentUnitPrice) * 100) / 100,
      unitPriceChangePercent: Math.round(-unitCostReduction * 100),
      newQuantity,
    });
  }

  simulateDelayPurchase(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const delayMonths = adjustments?.delayMonths || 1;
    const monthlyInflation = 0.05;

    const costIncrease = currentCost * monthlyInflation * delayMonths;
    const newCost = currentCost + costIncrease;

    const currentRisk = currentData?.risk || 50;
    const marketChange = delayMonths * 2;
    const newRisk = currentRisk + marketChange;

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, 80, 80, {
      recommendation: `Delaying purchase by ${delayMonths} month(s) could increase costs by ${Math.round(costIncrease).toLocaleString()} SAR (${Math.round(monthlyInflation * delayMonths * 100)}%) due to inflation`,
      delayMonths,
      inflationRate: monthlyInflation,
    });
  }

  async simulateChangeCountry(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const targetCountry = adjustments?.country || 'China';

    const countryFactors = {
      'China': { costFactor: 0.85, riskFactor: 1.2, deliveryFactor: 0.8 },
      'India': { costFactor: 0.80, riskFactor: 1.3, deliveryFactor: 0.7 },
      'USA': { costFactor: 1.3, riskFactor: 0.6, deliveryFactor: 1.3 },
      'Germany': { costFactor: 1.4, riskFactor: 0.4, deliveryFactor: 1.4 },
      'Saudi Arabia': { costFactor: 0.95, riskFactor: 0.5, deliveryFactor: 1.3 },
      'UAE': { costFactor: 1.1, riskFactor: 0.6, deliveryFactor: 1.2 },
      'Turkey': { costFactor: 0.85, riskFactor: 1.1, deliveryFactor: 0.9 },
      'Vietnam': { costFactor: 0.78, riskFactor: 1.25, deliveryFactor: 0.75 },
    };

    const factor = countryFactors[targetCountry] || { costFactor: 1.0, riskFactor: 1.0, deliveryFactor: 1.0 };

    const newCost = currentCost * factor.costFactor;
    const currentRisk = 50;
    const newRisk = Math.min(100, Math.round(50 * factor.riskFactor));
    const newDelivery = Math.min(100, Math.round(80 * factor.deliveryFactor));

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, 80, newDelivery, {
      recommendation: `Sourcing from ${targetCountry} could ${factor.costFactor < 1 ? 'reduce' : 'increase'} costs by ${Math.round(Math.abs(1 - factor.costFactor) * 100)}%`,
      targetCountry,
      costFactor: factor.costFactor,
    });
  }

  simulateBudgetChange(currentData, adjustments, direction) {
    const currentBudget = currentData?.budget || 500000;
    const currentCost = currentData?.orderTotal || 100000;
    const changePercent = adjustments?.changePercent || 20;
    const multiplier = direction === 'increase' ? (1 + changePercent / 100) : (1 - changePercent / 100);

    const newBudget = currentBudget * multiplier;
    const purchasingPower = direction === 'increase' ? 1.2 : 0.8;
    const newCost = currentCost * purchasingPower;

    const currentRisk = 50;
    const newRisk = direction === 'increase' ? 40 : 65;

    return this.buildResult(currentCost, newCost, currentRisk, newRisk, 80, 80, {
      recommendation: `${direction === 'increase' ? 'Increasing' : 'Reducing'} budget by ${changePercent}% ${direction === 'increase' ? 'expands' : 'limits'} procurement capacity`,
      budgetChange: Math.round((newBudget - currentBudget)),
      newBudget: Math.round(newBudget),
    });
  }

  async simulateUseExportSupplier(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const exportCostPremium = 0.08;
    const exportRiskReduction = 0.10;

    const newCost = currentCost * (1 + exportCostPremium);
    const newRisk = 45;
    const newDelivery = 75;

    return this.buildResult(currentCost, newCost, 50, newRisk, 80, newDelivery, {
      recommendation: `Export suppliers offer ${Math.round(exportRiskReduction * 100)}% risk reduction but at ${Math.round(exportCostPremium * 100)}% cost premium`,
    });
  }

  simulateAdvancePurchase(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const advanceMonths = adjustments?.advanceMonths || 3;
    const earlyDiscount = 0.03 * advanceMonths;

    const discount = Math.min(0.20, earlyDiscount);
    const newCost = currentCost * (1 - discount);

    const currentRisk = 50;
    const advanceRisk = Math.min(100, currentRisk + advanceMonths * 3);

    return this.buildResult(currentCost, newCost, currentRisk, advanceRisk, 80, 80, {
      recommendation: `Advancing purchase by ${advanceMonths} months saves ${Math.round(discount * 100)}% but increases inventory carrying risk`,
      advanceMonths,
      savingsPercent: Math.round(discount * 100),
    });
  }

  simulateGeneric(currentData, adjustments) {
    const currentCost = currentData?.orderTotal || 100000;
    const adjustmentFactor = adjustments?.costFactor || 1.0;

    const newCost = currentCost * adjustmentFactor;
    const newRisk = currentData?.risk || 50;
    const newDelivery = currentData?.delivery || 80;

    return this.buildResult(currentCost, newCost, 50, newRisk, 80, newDelivery, {
      recommendation: 'Generic scenario simulation completed',
    });
  }

  async getAverageOrderValue(currentData) {
    if (currentData?.vendorId) {
      const orders = await Order.find({ vendor: currentData.vendorId }).limit(20).lean();
      const values = orders.map(o => parseFloat(o.totalPrice) || o.totalAmount || o.total || 0).filter(v => v > 0);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 100000;
    }
    return 100000;
  }

  calcVendorRiskScore(vendor) {
    let score = 30;
    if (!vendor.isVerified) score += 20;
    if (!vendor.isActive) score += 25;
    return Math.min(100, score);
  }

  estimateNewVendorCost(currentCost, currentVendor, newVendor) {
    const currentRep = currentVendor?.reputation?.overall || 50;
    const newRep = newVendor?.reputation?.overall || 50;
    const repDiff = (newRep - currentRep) / 100;
    return currentCost * (1 - repDiff * 0.1);
  }

  buildResult(currentCost, newCost, currentRisk, newRisk, currentDelivery, newDelivery, extra) {
    const costChange = newCost - currentCost;
    const costChangePercent = currentCost > 0 ? ((newCost - currentCost) / currentCost) * 100 : 0;
    const riskImprovement = currentRisk - newRisk;
    const deliveryImprovement = newDelivery - currentDelivery;

    return {
      costImpact: {
        current: Math.round(currentCost),
        simulated: Math.round(newCost),
        change: Math.round(costChange),
        changePercent: Math.round(costChangePercent * 100) / 100,
      },
      riskImpact: {
        current: Math.round(currentRisk),
        simulated: Math.round(newRisk),
        improvement: Math.round(riskImprovement),
      },
      deliveryImpact: {
        current: Math.round(currentDelivery),
        simulated: Math.round(newDelivery),
        improvement: Math.round(deliveryImprovement),
      },
      savings: Math.round(Math.max(0, currentCost - newCost)),
      ...extra,
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new ScenarioSimulationService();
