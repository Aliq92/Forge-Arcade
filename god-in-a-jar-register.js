"use strict";

GAMES.push({
  id: "god-in-a-jar",
  title: "God in a Jar",
  description:
    "A universe that remembers. Six autonomous creatures build societies, pass on memories and give meaning to your small environmental interventions.",
  category: "Simulations",
  featured: true,
  tags: [
    "Artificial life",
    "Cultural memory",
    "Generations",
    "Keyboard + touch",
  ],
  artId: "god-in-a-jar",
  palette: ["#afe2cd", "#c4a0ed"],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render("All");
