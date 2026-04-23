function createPlaceholderHero(neighborhoodName) {
  return {
    slug: "",
    neighborhoodName,
    title: `${neighborhoodName} image coming soon`,
    sourceUrl: "/about/",
    localFilename: "placeholders/image-coming-soon.svg",
    imagePath: "/assets/img/neighborhoods/placeholders/image-coming-soon.svg",
    cardImagePath: "/assets/img/neighborhoods/placeholders/image-coming-soon.svg",
    altText: `Image coming soon for the ${neighborhoodName} neighborhood in White Plains.`,
    cardAltText: `Image coming soon for the ${neighborhoodName} neighborhood in White Plains.`,
    photographer: "WPCNA",
    attributionText: "WPCNA",
    attributionUrl: "/about/",
    license: "Image coming soon",
    licenseUrl: "/about/",
    attributionRequired: false,
    matchType: "placeholder",
    status: "placeholder",
    note: `A neighborhood photo for ${neighborhoodName} is still being finalized.`
  };
}

function createProvidedHero({ neighborhoodName, filename, altText, note = "" }) {
  const imagePath = `/assets/img/neighborhoods/photos/${filename}`;

  return {
    slug: "",
    neighborhoodName,
    title: `${neighborhoodName} neighborhood photo`,
    sourceUrl: "/about/",
    localFilename: `photos/${filename}`,
    imagePath,
    cardImagePath: imagePath,
    altText,
    cardAltText: altText,
    photographer: "Provided to WPCNA",
    attributionText: "Photo provided to WPCNA",
    attributionUrl: "/about/",
    license: "Used with permission",
    licenseUrl: "/about/",
    attributionRequired: false,
    matchType: "provided-photo",
    status: "photo",
    note: note || `Neighborhood photo provided for ${neighborhoodName}.`
  };
}

module.exports = {
  createPlaceholderHero,
  createProvidedHero
};
