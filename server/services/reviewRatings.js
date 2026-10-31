const Review = require("../models/Review");

async function loadVisibleRatings(menuItemIds) {
  if (menuItemIds.length === 0) return new Map();
  const rows = await Review.aggregate([
    { $match: { menuItem: { $in: menuItemIds }, isVisible: true } },
    {
      $group: {
        _id: "$menuItem",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((row) => [
    String(row._id),
    { average: Math.round(row.average * 10) / 10, count: row.count },
  ]));
}

module.exports = { loadVisibleRatings };
