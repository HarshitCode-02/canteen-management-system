const MAX_ITEMS_PER_CANTEEN = 200;
const MAX_SEARCH_NODES = 5000;
const MAX_RESULTS = 12;

const compareText = (a, b) => String(a).localeCompare(String(b));

function suggestMealCombinations(menuItems, budgetPaise, maxItems = 3) {
  const grouped = new Map();
  for (const item of menuItems) {
    const pricePaise = Math.round(Number(item.price) * 100);
    if (!Number.isSafeInteger(pricePaise) || pricePaise < 0 || pricePaise > budgetPaise) continue;

    const canteenId = String(item.canteen?._id || item.canteen);
    const group = grouped.get(canteenId) || {
      canteen: {
        id: canteenId,
        name: item.canteen?.name || "",
      },
      items: [],
    };
    group.items.push({
      id: String(item._id),
      name: item.name,
      category: item.category,
      pricePaise,
    });
    grouped.set(canteenId, group);
  }

  const candidates = [];
  for (const group of grouped.values()) {
    const choices = group.items
      .sort((a, b) => a.pricePaise - b.pricePaise || compareText(a.name, b.name))
      .slice(0, MAX_ITEMS_PER_CANTEEN);
    let visited = 0;

    const visit = (start, selected, totalPaise) => {
      if (selected.length > 0) {
        candidates.push({
          canteen: group.canteen,
          items: selected.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.pricePaise / 100,
          })),
          totalPaise,
        });
      }
      if (selected.length >= maxItems || visited >= MAX_SEARCH_NODES) return;

      for (let index = start; index < choices.length && visited < MAX_SEARCH_NODES; index += 1) {
        visited += 1;
        const item = choices[index];
        const nextTotal = totalPaise + item.pricePaise;
        if (nextTotal > budgetPaise) continue;
        selected.push(item);
        visit(index + 1, selected, nextTotal);
        selected.pop();
      }
    };

    visit(0, [], 0);
  }

  return candidates
    .sort((a, b) =>
      b.totalPaise - a.totalPaise ||
      b.items.length - a.items.length ||
      compareText(a.canteen.name, b.canteen.name) ||
      compareText(a.items.map((item) => item.name).join("|"), b.items.map((item) => item.name).join("|"))
    )
    .slice(0, MAX_RESULTS)
    .map(({ totalPaise, ...suggestion }) => ({
      ...suggestion,
      total: totalPaise / 100,
    }));
}

module.exports = { suggestMealCombinations };
