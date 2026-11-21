(() => {
  const content = document.querySelector(".permission-content");
  const desktopNav = document.querySelector(".permission-sidebar nav");
  const mobileNav = document.querySelector(".permission-mobile-nav");
  const currentLabel = document.querySelector(".permission-current-label");
  const currentSection = document.createElement("span");
  const currentSubsection = document.createElement("span");
  currentLabel.replaceChildren(currentSection, currentSubsection);
  const headings = [...content.querySelectorAll("h2, h3")];
  const sections = [];
  const entries = [];
  const toc = document.createElement("ul");
  toc.className = "permission-toc";

  for (const heading of headings) {
    const isSection = heading.tagName === "H2";
    const sectionIndex = isSection ? sections.length : sections.length - 1;
    const section = isSection ? { heading, children: [] } : sections[sectionIndex];
    if (isSection) sections.push(section);
    heading.id ||= isSection ? `permission-section-${sectionIndex + 1}`
      : `permission-section-${sectionIndex + 1}-${section.children.length + 1}`;
    const entry = { heading, sectionIndex };
    entries.push(entry);
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    item.append(link);
    if (isSection) {
      section.item = item;
      section.list = document.createElement("ul");
      item.append(section.list);
      toc.append(item);
    } else {
      section.children.push(entry);
      section.list.append(item);
    }
  }

  desktopNav.append(toc);
  const mobileToc = toc.cloneNode(true);
  mobileNav.querySelector("nav").append(mobileToc);
  const navs = [toc, mobileToc];
  let pending = false;

  function update() {
    pending = false;
    const narrow = window.matchMedia("(max-width: 1100px)").matches;
    const offset = narrow ? mobileNav.querySelector("summary").getBoundingClientRect().height + 16 : 24;
    document.documentElement.style.setProperty("--permission-scroll-offset", `${offset}px`);
    let active = entries[0];
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top > offset + 1) break;
      active = entry;
    }
    const section = sections[active.sectionIndex];
    currentSection.textContent = section.heading.textContent.trim();
    currentSubsection.textContent = active.heading === section.heading ? "" : `› ${active.heading.textContent.trim()}`;
    currentLabel.title = [currentSection.textContent, currentSubsection.textContent].filter(Boolean).join(" ");
    for (const nav of navs) {
      [...nav.children].forEach((item, index) => item.classList.toggle("is-active", index === active.sectionIndex));
      for (const link of nav.querySelectorAll("a")) {
        if (link.getAttribute("href") === `#${active.heading.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  }

  function scheduleUpdate() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }

  mobileNav.addEventListener("click", event => {
    if (event.target.closest("a")) mobileNav.open = false;
  });
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("load", scheduleUpdate);
  document.fonts?.ready.then(scheduleUpdate);
  update();
})();
