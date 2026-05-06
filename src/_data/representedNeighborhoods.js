const neighborhoodStore = require("./neighborhoodStore");
const featuredNeighborhoodMap = require("./featuredNeighborhoodMap");
const { createPlaceholderHero } = require("./neighborhoodHeroHelpers");
const mapRegionBySlug = new Map(
  (featuredNeighborhoodMap.allRegions || featuredNeighborhoodMap.regions).map((region) => [
    region.slug,
    region
  ])
);
const includeGedneyMeadows = false;

function uniqueParagraphs(paragraphs = []) {
  const seen = new Set();

  return paragraphs
    .map((paragraph) => String(paragraph || "").trim())
    .filter(Boolean)
    .filter((paragraph) => {
      const normalized = paragraph.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function removeLeadDupes(paragraphs = [], lead = "") {
  const normalizedLead = String(lead || "").trim().toLowerCase();

  if (!normalizedLead) {
    return paragraphs;
  }

  return paragraphs.filter((paragraph) => paragraph.toLowerCase() !== normalizedLead);
}

function buildExisting(slug, overrides = {}) {
  const neighborhood = neighborhoodStore.bySlug[slug];
  const mapSlug = overrides.mapSlug || slug;
  const mapRegion = mapRegionBySlug.get(mapSlug) || null;
  const teaser = overrides.teaser || neighborhood.teaser;

  if (!neighborhood) {
    throw new Error(`Missing represented neighborhood data for slug: ${slug}`);
  }

  const bodyParagraphs = removeLeadDupes(
    uniqueParagraphs(overrides.bodyParagraphs || neighborhood.detailParagraphs || []),
    teaser
  );

  return {
    slug: overrides.slug || slug,
    name: overrides.name || neighborhood.name,
    group: overrides.group || neighborhood.group,
    teaser,
    bodyParagraphs,
    hero: neighborhood.hero
      ? {
          imagePath: neighborhood.hero.imagePath,
          cardImagePath: neighborhood.hero.cardImagePath,
          altText: neighborhood.hero.altText,
          cardAltText: neighborhood.hero.cardAltText
        }
      : null,
    resourceLinks: neighborhood.resourceLinks || [],
    detailUrl: neighborhood.detailUrl,
    reviewNote: overrides.reviewNote || "",
    aliases: overrides.aliases || [],
    isPlaceholder: false,
    mapRegionSlug: mapRegion ? mapSlug : "",
    mapRegion: mapRegion
      ? {
          pathD: mapRegion.pathD,
          points: mapRegion.points || ""
        }
      : null
  };
}

function buildPlaceholder(config) {
  const mapSlug = config.mapSlug || config.slug;
  const mapRegion = mapRegionBySlug.get(mapSlug) || null;
  const bodyParagraphs = removeLeadDupes(
    uniqueParagraphs(config.bodyParagraphs),
    config.teaser
  );

  return {
    slug: config.slug,
    name: config.name,
    group: config.group || "WPCNA represented neighborhood",
    teaser: config.teaser,
    bodyParagraphs,
    hero: config.hero || null,
    detailUrl: "",
    reviewNote: config.reviewNote || "",
    aliases: config.aliases || [],
    isPlaceholder: true,
    resourceLinks: config.resourceLinks || [],
    mapRegionSlug: mapRegion ? mapSlug : "",
    mapRegion: mapRegion
      ? {
          pathD: mapRegion.pathD,
          points: mapRegion.points || ""
        }
      : null
  };
}

const items = [
  buildExisting("north-broadway"),
  buildExisting("battle-hill"),
  buildExisting("fisher-hill"),
  buildExisting("highlands"),
  buildPlaceholder({
    slug: "carhart",
    name: "Carhart",
    mapSlug: "carhart",
    teaser: "Carhart is among the White Plains neighborhoods currently represented through WPCNA.",
    bodyParagraphs: [
      "Recent WPCNA meeting minutes list Carhart among the neighborhood associations currently represented in council meetings.",
      "A fuller public profile is being reviewed before publication. This placeholder keeps the represented-neighborhood list current without adding claims that still need final confirmation."
    ],
    reviewNote: "Profile under review",
    aliases: ["Carhartt"],
    hero: createPlaceholderHero("Carhart")
  }),
  buildExisting("gedney-farms"),
  buildExisting("north-street"),
  buildExisting("rosedale"),
  buildExisting("old-oak-ridge")
];

if (includeGedneyMeadows) {
  items.push(buildExisting("gedney-meadows"));
}

module.exports = {
  imagePath: featuredNeighborhoodMap.imagePath,
  imageVersion: featuredNeighborhoodMap.imageVersion,
  imageAlt:
    "White Plains neighborhood map with clickable highlights for the neighborhoods currently represented through WPCNA.",
  imageWidth: featuredNeighborhoodMap.imageWidth,
  imageHeight: featuredNeighborhoodMap.imageHeight,
  viewBoxWidth: featuredNeighborhoodMap.viewBoxWidth,
  viewBoxHeight: featuredNeighborhoodMap.viewBoxHeight,
  includeGedneyMeadows,
  items,
  mappedItems: items.filter((item) => item.mapRegion)
};
