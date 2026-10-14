/**
 * Factor condition color & icon classification helper.
 *
 * Rule:
 * - Favorable conditions: Green (text-emerald-600)
 * - Moderate conditions:
 *   - Upper middle / neutral: Yellow (text-amber-500)
 *   - Lower middle / caution / marginal: Orange (text-orange-500)
 * - Unfavorable conditions: Red (text-red-600)
 *
 * Returns: { iconType, colorClass, condition }
 */

export function resolveFactorCondition(moduleKey, moduleLevel, reasonKey = "", text = "") {
  const mod = String(moduleKey || "").toLowerCase();

  let rawLvl = "";
  if (typeof moduleLevel === "object" && moduleLevel !== null) {
    rawLvl = String(
      moduleLevel.level ||
      moduleLevel.classification ||
      moduleLevel.outlook ||
      moduleLevel.status ||
      ""
    ).toLowerCase().replace(/\s+/g, "_");
  } else {
    rawLvl = String(moduleLevel || "").toLowerCase().replace(/\s+/g, "_");
  }

  const rk = String(reasonKey || "").toLowerCase();
  const txt = String(text || "").toLowerCase();

  // 1. Determine iconType
  let iconType = "profit";
  if (mod.includes("price") || mod.includes("presyo")) {
    iconType = "price";
  } else if (mod.includes("arrival") || mod.includes("supply") || mod.includes("suplay") || mod.includes("naabot")) {
    iconType = "supply";
  } else if (mod.includes("production") || mod.includes("produksyon")) {
    iconType = "production";
  } else if (mod.includes("weather") || mod.includes("panahon")) {
    iconType = "weather";
  } else if (mod.includes("profit") || mod.includes("kita") || mod.includes("ganansya") || mod.includes("ginansya")) {
    iconType = "profit";
  }

  // 2. Determine condition tier
  let condition = "favorable";

  if (iconType === "price") {
    if (
      rawLvl.includes("unfavorable") ||
      rawLvl.includes("falling") ||
      rawLvl.includes("mous-os") ||
      rawLvl.includes("mubaba") ||
      rawLvl.includes("nibaba") ||
      rawLvl.includes("minaog") ||
      rawLvl.includes("drop") ||
      rk.includes("unfavorable") ||
      txt.includes("unfavorable") ||
      txt.includes("mous-os") ||
      txt.includes("mubaba") ||
      txt.includes("nibaba") ||
      txt.includes("minaog") ||
      txt.includes("falling")
    ) {
      condition = "unfavorable"; // red
    } else if (
      rawLvl.includes("neutral") ||
      rawLvl.includes("moderate") ||
      rawLvl.includes("stable") ||
      rawLvl.includes("kasarangan") ||
      rawLvl.includes("halos_pareho") ||
      rawLvl.includes("pareho") ||
      rk.includes("neutral") ||
      txt.includes("halos pareho") ||
      txt.includes("stable") ||
      txt.includes("neutral") ||
      txt.includes("lig-on")
    ) {
      condition = "upper_middle"; // yellow
    } else if (rawLvl.includes("lower_middle") || txt.includes("lower_middle")) {
      condition = "lower_middle"; // orange
    } else {
      condition = "favorable"; // green
    }
  } else if (iconType === "weather") {
    if (
      rawLvl.includes("severe") ||
      rawLvl.includes("high") ||
      rawLvl.includes("storm") ||
      rawLvl.includes("bagyo") ||
      rawLvl.includes("taas") ||
      rawLvl.includes("unfavorable") ||
      rk.includes("severe") ||
      rk.includes("compounded") ||
      txt.includes("taas ang risgo") ||
      txt.includes("taas ang risk") ||
      txt.includes("severe") ||
      txt.includes("storm") ||
      txt.includes("kusog nga ulan")
    ) {
      condition = "unfavorable"; // red
    } else if (
      rawLvl.includes("caution") ||
      rawLvl.includes("moderate") ||
      rawLvl.includes("bantayan") ||
      rawLvl.includes("init") ||
      rawLvl.includes("heat") ||
      rk.includes("caution") ||
      txt.includes("caution") ||
      txt.includes("bantayan") ||
      txt.includes("kinahanglan bantayan")
    ) {
      condition = "lower_middle"; // orange
    } else {
      condition = "favorable"; // green
    }
  } else if (iconType === "profit") {
    if (
      rawLvl.includes("unfavorable") ||
      rawLvl.includes("negative") ||
      rawLvl.includes("loss") ||
      rawLvl.includes("alkansi") ||
      rk.includes("unfavorable") ||
      txt.includes("unfavorable") ||
      txt.includes("loss") ||
      txt.includes("alkansi")
    ) {
      condition = "unfavorable"; // red
    } else if (
      rawLvl.includes("marginal") ||
      rawLvl.includes("moderate") ||
      rawLvl.includes("gamay") ||
      rawLvl.includes("duol") ||
      rk.includes("marginal") ||
      txt.includes("marginal")
    ) {
      condition = "lower_middle"; // orange
    } else {
      condition = "favorable"; // green
    }
  } else if (iconType === "supply" || iconType === "production") {
    if (
      rawLvl.includes("high") ||
      rawLvl.includes("oversupply") ||
      rawLvl.includes("taas") ||
      rawLvl.includes("dagsang") ||
      rawLvl.includes("daghan") ||
      rk.includes("high") ||
      txt.includes("taas") ||
      txt.includes("high") ||
      txt.includes("oversupply")
    ) {
      condition = "unfavorable"; // red
    } else if (
      rawLvl.includes("upper_middle") ||
      rk.includes("upper_middle") ||
      rawLvl.includes("moderate") ||
      rawLvl.includes("kasarangan") ||
      txt.includes("upper_middle") ||
      txt.includes("kasarangan") ||
      txt.includes("moderate") ||
      txt.includes("lig-on")
    ) {
      condition = "upper_middle"; // yellow
    } else if (
      rawLvl.includes("lower_middle") ||
      rk.includes("lower_middle") ||
      txt.includes("lower_middle")
    ) {
      condition = "lower_middle"; // orange
    } else if (
      rawLvl.includes("low") ||
      rawLvl.includes("ubos") ||
      rawLvl.includes("minaog") ||
      rawLvl.includes("dropped") ||
      rawLvl.includes("favorable") ||
      txt.includes("ubos") ||
      txt.includes("minaog") ||
      txt.includes("dropped")
    ) {
      condition = "favorable"; // green
    } else {
      condition = "favorable"; // green
    }
  }

  // 3. Map condition tier to Tailwind color classes
  let colorClass = "text-emerald-600";
  if (condition === "upper_middle") {
    colorClass = "text-yellow-500"; // yellow
  } else if (condition === "lower_middle") {
    colorClass = "text-orange-500"; // orange
  } else if (condition === "unfavorable") {
    colorClass = "text-red-600"; // red
  }

  return { iconType, colorClass, condition };
}
