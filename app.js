let ROUTES = [];
let visibleLimit = 120;

const $ = id => document.getElementById(id);

const els = {
  search: $("search"),
  crag: $("crag"),
  minGrade: $("minGrade"),
  maxGrade: $("maxGrade"),
  minAscents: $("minAscents"),
  minRating: $("minRating"),
  sort: $("sort"),
  list: $("list"),
  count: $("count"),
  more: $("more"),
  reset: $("reset"),
  subtitle: $("subtitle")
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[ch]);
}

function setupFilters() {
  const crags = [...new Map(
    ROUTES.map(r => [r.cragId, r.crag])
  ).entries()].sort((a,b) => a[1].localeCompare(b[1]));

  for (const [id, name] of crags) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = name;
    els.crag.appendChild(o);
  }

  const grades = [...new Map(
    ROUTES
      .filter(r => r.gradeInt != null && r.grade)
      .sort((a,b) => a.gradeInt - b.gradeInt)
      .map(r => [r.gradeInt, r.grade])
  ).entries()];

  for (const [value, label] of grades) {
    for (const el of [els.minGrade, els.maxGrade]) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      el.appendChild(o);
    }
  }
}

function getFiltered() {
  const q = els.search.value.trim().toLowerCase();
  const crag = els.crag.value;
  const minGrade = els.minGrade.value ? Number(els.minGrade.value) : -Infinity;
  const maxGrade = els.maxGrade.value ? Number(els.maxGrade.value) : Infinity;
  const minAscents = Number(els.minAscents.value || 0);
  const minRating = Number(els.minRating.value || 0);

  let arr = ROUTES.filter(r => {
    const searchText = `${r.name} ${r.crag} ${r.sector}`.toLowerCase();

    if (q && !searchText.includes(q)) return false;
    if (crag && r.cragId !== crag) return false;

    if ((minGrade !== -Infinity || maxGrade !== Infinity)) {
      if (r.gradeInt == null) return false;
      if (r.gradeInt < minGrade || r.gradeInt > maxGrade) return false;
    }

    if (r.ascents < minAscents) return false;
    if (r.rating < minRating) return false;

    return true;
  });

  switch (els.sort.value) {
    case "rating":
      arr.sort((a,b) => (b.rating-a.rating) || (b.ascents-a.ascents));
      break;
    case "gradeAsc":
      arr.sort((a,b) => ((a.gradeInt ?? 999999)-(b.gradeInt ?? 999999)) || (b.ascents-a.ascents));
      break;
    case "gradeDesc":
      arr.sort((a,b) => ((b.gradeInt ?? -1)-(a.gradeInt ?? -1)) || (b.ascents-a.ascents));
      break;
    case "name":
      arr.sort((a,b) => a.name.localeCompare(b.name));
      break;
    default:
      arr.sort((a,b) => (b.ascents-a.ascents) || (b.rating-a.rating));
  }

  return arr;
}

function render() {
  const arr = getFiltered();
  const shown = arr.slice(0, visibleLimit);

  els.count.textContent = `${arr.length.toLocaleString()} boulders`;

  if (!shown.length) {
    els.list.innerHTML = `<div class="empty">No boulders match these filters.</div>`;
    els.more.hidden = true;
    return;
  }

  els.list.innerHTML = shown.map(r => `
    <article class="route">
      <div class="name" title="${esc(r.name)}">${esc(r.name)}</div>
      <div><span class="grade">${esc(r.grade || "—")}</span></div>
      <div><strong>${r.ascents}</strong><div class="meta">ascents</div></div>
      <div><strong>${r.rating.toFixed(2)}</strong><div class="meta">rating</div></div>
      <div class="crag"><strong>${esc(r.crag)}</strong></div>
      <div class="sector meta">${esc(r.sector)}</div>
      <div class="links">
        <a href="${esc(r.routeUrl)}" target="_blank" rel="noopener">TheTopo ↗</a>
        ${r.mapUrl ? `<a href="${esc(r.mapUrl)}" target="_blank" rel="noopener">Map ↗</a>` : ""}
      </div>
      ${r.tags?.length ? `
        <div class="tags">
          ${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>` : ""}
    </article>
  `).join("");

  els.more.hidden = arr.length <= visibleLimit;
}

function setPreset(name) {
  document.querySelectorAll("[data-preset]").forEach(
    b => b.classList.toggle("active", b.dataset.preset === name)
  );

  if (name === "popular") {
    els.minAscents.value = 20;
    els.minRating.value = "0";
    els.sort.value = "ascents";
  } else if (name === "rated") {
    els.minAscents.value = 10;
    els.minRating.value = "1.5";
    els.sort.value = "rating";
  } else {
    els.minAscents.value = 0;
    els.minRating.value = "0";
    els.sort.value = "ascents";
  }

  visibleLimit = 120;
  render();
}

async function init() {
  try {
    const response = await fetch("data/boulders.json");
    ROUTES = await response.json();

    els.subtitle.textContent = `${ROUTES.length.toLocaleString()} boulders from TheTopo data`;

    setupFilters();
    render();
  } catch (error) {
    els.subtitle.textContent = "Could not load data.";
    els.list.innerHTML = `
      <div class="empty">
        Data could not be loaded. This version should be opened through GitHub Pages or another web host.
      </div>`;
    console.error(error);
  }
}

for (const id of ["search","crag","minGrade","maxGrade","minAscents","minRating","sort"]) {
  $(id).addEventListener(id === "search" ? "input" : "change", () => {
    visibleLimit = 120;
    document.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("active"));
    render();
  });
}

document.querySelectorAll("[data-preset]").forEach(
  b => b.addEventListener("click", () => setPreset(b.dataset.preset))
);

els.more.addEventListener("click", () => {
  visibleLimit += 120;
  render();
});

els.reset.addEventListener("click", () => {
  els.search.value = "";
  els.crag.value = "";
  els.minGrade.value = "";
  els.maxGrade.value = "";
  setPreset("all");
});

init();
