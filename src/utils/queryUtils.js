import mongoose from 'mongoose';

export const buildTextSearch = (query, fields = ['name', 'description']) => {
  if (!query) return {};
  return { $or: fields.map(f => ({ [f]: { $regex: query, $options: 'i' } })) };
};

export const withLean = (query) => query.lean();

export const withPagination = (query, page = 1, limit = 20) => {
  return query.skip((page - 1) * limit).limit(limit);
};

export const withPopulation = (query, paths = []) => {
  return paths.reduce((q, p) => q.populate(p), query);
};

export const buildAggregation = (pipeline = []) => {
  return mongoose.model.aggregate(pipeline).option({ allowDiskUse: true });
};

export const addTimestamps = (data) => ({
  ...data,
  createdAt: new Date(),
  updatedAt: new Date(),
});
