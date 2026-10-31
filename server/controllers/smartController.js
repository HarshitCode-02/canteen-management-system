const mongoose = require("mongoose");
const Canteen = require("../models/Canteen");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const { suggestMealCombinations } = require("../services/mealSuggestions");

const MAX_BUDGET_RUPEES = 5000;
const MAX_MENU_ITEMS = 200;
const MAX_ASSISTANT_MESSAGE_LENGTH = 300;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBudget = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_BUDGET_RUPEES) {
    return null;
  }
  const paise = Math.round(value * 100);
  return Math.abs(value * 100 - paise) < 1e-8 ? paise : null;
};

async function loadMealSuggestions({ budgetPaise, maxItems, canteenId, category }) {
  const canteenFilter = { isActive: true, isOpen: true };
  if (canteenId) canteenFilter._id = canteenId;
  const canteens = await Canteen.find(canteenFilter).select("_id name").sort({ name: 1 }).limit(20);
  if (canteens.length === 0) return [];

  const itemFilter = {
    canteen: { $in: canteens.map((canteen) => canteen._id) },
    isAvailable: true,
  };
  if (category) itemFilter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  const menuItems = await MenuItem.find(itemFilter)
    .sort({ price: 1, name: 1 })
    .limit(MAX_MENU_ITEMS)
    .populate("canteen", "name");
  return suggestMealCombinations(menuItems, budgetPaise, maxItems);
}

exports.suggestMeals = async (req, res, next) => {
  try {
    const body = req.body || {};
    const budgetPaise = parseBudget(body.budget);
    if (budgetPaise === null) {
      return res.status(400).json({ message: "budget must be a positive amount up to ₹5000 with at most two decimal places" });
    }

    const maxItems = body.maxItems === undefined ? 3 : body.maxItems;
    if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 4) {
      return res.status(400).json({ message: "maxItems must be an integer from 1 to 4" });
    }

    let canteenId;
    if (body.canteenId !== undefined) {
      if (!mongoose.isValidObjectId(body.canteenId)) {
        return res.status(400).json({ message: "Invalid canteen id" });
      }
      canteenId = body.canteenId;
    }
    let category;
    if (body.category !== undefined) {
      if (typeof body.category !== "string" || body.category.trim().length > 40) {
        return res.status(400).json({ message: "category must be text no longer than 40 characters" });
      }
      category = body.category.trim();
    }

    const suggestions = await loadMealSuggestions({ budgetPaise, maxItems, canteenId, category });
    res.json({ budget: budgetPaise / 100, suggestions });
  } catch (err) {
    next(err);
  }
};

async function activeCanteens() {
  return Canteen.find({ isActive: true, isOpen: true })
    .select("_id name")
    .sort({ name: 1 })
    .limit(20);
}

async function searchMenu(term) {
  const canteens = await activeCanteens();
  if (canteens.length === 0) return [];
  const filter = {
    canteen: { $in: canteens.map((canteen) => canteen._id) },
    isAvailable: true,
  };
  const words = term.match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length > 0) {
    filter.$and = words.map((word) => {
      const normalized = word.replace(/(?:ches|shes|xes|zes)$/i, (ending) => ending.slice(0, -2))
        .replace(/s$/i, "");
      const expression = new RegExp(escapeRegex(normalized || word), "i");
      return { $or: [{ name: expression }, { category: expression }] };
    });
  }
  return MenuItem.find(filter)
    .select("name category price canteen")
    .sort({ name: 1 })
    .limit(10)
    .populate("canteen", "name");
}

async function currentOrder(userId) {
  return Order.findOne({
    user: userId,
    status: { $in: ["placed", "preparing", "ready"] },
  })
    .select("orderNumber status pickupTime createdAt")
    .sort({ createdAt: -1 })
    .populate("canteen", "name");
}

const orderStatusText = (order) =>
  order
    ? `Order #${order.orderNumber} from ${order.canteen?.name || "your canteen"} is ${order.status}.`
    : "You have no active order.";

exports.assist = async (req, res, next) => {
  try {
    const message = req.body?.message;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Enter a question first" });
    }
    const text = message.trim();
    if (text.length > MAX_ASSISTANT_MESSAGE_LENGTH) {
      return res.status(400).json({ message: "Question must be 300 characters or fewer" });
    }

    const lower = text.toLowerCase();
    if (/^(help|hi|hello|hey)\b/.test(lower)) {
      return res.json({
        intent: "help",
        reply: "Ask me to find a menu item, list available items, suggest a meal under a budget, or check your own active order.",
      });
    }

    if (/\b(my|current)\b.*\b(order|status)\b|\b(order|status)\b.*\b(my|current)\b/.test(lower)) {
      const order = await currentOrder(req.user._id);
      return res.json({ intent: "check_order_status", reply: orderStatusText(order) });
    }

    const budget = text.match(/(?:under|within|budget(?:\s+of)?)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d{1,2})?)/i);
    if (budget && /\b(meal|suggest|recommend|budget)\b/.test(lower)) {
      const budgetPaise = parseBudget(Number(budget[1]));
      if (budgetPaise === null) {
        return res.status(400).json({ message: "Budget must be a positive amount up to ₹5000" });
      }
      const suggestions = await loadMealSuggestions({ budgetPaise, maxItems: 3 });
      return res.json({
        intent: "suggest_meal",
        reply: suggestions.length ? `Here are meal combinations within ₹${budgetPaise / 100}.` : "No available combinations fit that budget.",
        suggestions,
      });
    }

    if (/\b(popular|best.?selling|top items?)\b/.test(lower)) {
      const canteens = await activeCanteens();
      const isToday = /\btoday\b/.test(lower);
      const since = new Date(Date.now() - (isToday ? 24 : 7 * 24) * 60 * 60 * 1000);
      const popular = canteens.length
        ? await Order.aggregate([
            { $match: { canteen: { $in: canteens.map((canteen) => canteen._id) }, createdAt: { $gte: since }, status: { $ne: "cancelled" } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.menuItem", quantity: { $sum: "$items.qty" } } },
            { $sort: { quantity: -1, _id: 1 } },
            { $limit: 5 },
          ])
        : [];
      const menuItems = popular.length
        ? await MenuItem.find({ _id: { $in: popular.map((item) => item._id) }, isAvailable: true })
            .select("name category price canteen")
            .populate("canteen", "name")
        : [];
      const quantities = new Map(popular.map((item) => [String(item._id), item.quantity]));
      const items = menuItems.map((item) => ({ ...item.toObject(), orderedQuantity: quantities.get(String(item._id)) }));
      return res.json({
        intent: "popular_items",
        reply: items.length
          ? `These available items were ordered most in the last ${isToday ? "24 hours" : "seven days"}.`
          : "There are no recent popular items to show.",
        items,
      });
    }

    if (/\b(compare|comparison)\b.*\bcanteens?\b|\bcanteens?\b.*\b(compare|comparison)\b/.test(lower)) {
      const canteens = await Canteen.find({ isActive: true })
        .select("_id name location isOpen")
        .sort({ name: 1 })
        .limit(20);
      return res.json({
        intent: "compare_canteens",
        reply: canteens.length ? "Select canteens in the comparison section to compare matching menu items and prices." : "No active canteens are available to compare.",
        canteens,
      });
    }

    if (/\b(canteen|canteens)\b/.test(lower) && /\b(find|search|where|located)\b/.test(lower)) {
      const term = text
        .replace(/^(find|search for|where is|where can i find)\s+(the\s+)?canteen\s*/i, "")
        .replace(/\b(canteen|canteens|please)\b/gi, "")
        .trim();
      const filter = { isActive: true };
      if (term) {
        const expression = new RegExp(escapeRegex(term), "i");
        filter.$or = [{ name: expression }, { location: expression }];
      }
      const canteens = await Canteen.find(filter)
        .select("_id name location isOpen")
        .sort({ name: 1 })
        .limit(10);
      return res.json({
        intent: "search_canteen",
        reply: canteens.length ? `Found ${canteens.length} active canteen${canteens.length === 1 ? "" : "s"}.` : "No matching active canteens were found.",
        canteens,
      });
    }

    const searchTerm = text
      .replace(/^(which canteen sells|where can i find|find|search for|show me|do you have)\s+/i, "")
      .replace(/\b(available|items?|menu|please|today)\b/gi, "")
      .trim();
    const items = await searchMenu(searchTerm);
    return res.json({
      intent: searchTerm ? "search_menu" : "available_items",
      reply: items.length ? `Found ${items.length} available menu item${items.length === 1 ? "" : "s"}.` : "No matching available items were found.",
      items,
    });
  } catch (err) {
    next(err);
  }
};
