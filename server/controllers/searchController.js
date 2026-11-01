const Canteen = require("../models/Canteen");
const MenuItem = require("../models/MenuItem");
const { normalizeSearchQuery, escapeRegex } = require("../services/searchQuery");

const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 8;

exports.search = async (req, res, next) => {
  const query = normalizeSearchQuery(req.query.q);
  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ message: `Search query must be at most ${MAX_QUERY_LENGTH} characters` });
  }
  if (query.length < 2) return res.json({ canteens: [], items: [] });

  try {
    const matcher = new RegExp(escapeRegex(query), "i");
    const canteens = await Canteen.find({
      isActive: true,
      $or: [
        { name: matcher },
        { description: matcher },
        { location: matcher },
      ],
    })
      .select("name logo description location isOpen")
      .sort({ name: 1 })
      .limit(MAX_RESULTS);
    const activeCanteenIds = await Canteen.distinct("_id", { isActive: true });

    const items = activeCanteenIds.length === 0
      ? []
      : await MenuItem.find({
        canteen: { $in: activeCanteenIds },
        isAvailable: true,
        $or: [{ name: matcher }, { category: matcher }],
      })
        .select("name price category image isAvailable canteen")
        .populate("canteen", "name isOpen")
        .sort({ name: 1 })
        .limit(MAX_RESULTS);

    res.json({
      canteens: canteens.map((canteen) => ({
        _id: canteen._id,
        name: canteen.name,
        logo: canteen.logo,
        description: canteen.description,
        location: canteen.location,
        isOpen: canteen.isOpen,
      })),
      items: items.map((item) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image,
        isAvailable: item.isAvailable,
        canteen: item.canteen && {
          _id: item.canteen._id,
          name: item.canteen.name,
          isOpen: item.canteen.isOpen,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
};
