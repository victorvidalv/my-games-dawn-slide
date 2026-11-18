const motion = matchMedia('(prefers-reduced-motion: reduce)');

if ('IntersectionObserver' in window && !motion.matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (!motion.matches) entry.target.classList.add('chapter-enter');
    }
  }, { threshold: 0.08 });

  for (const section of document.querySelectorAll('.chapters .section')) {
    if (section.getBoundingClientRect().top >= innerHeight) observer.observe(section);
  }
}
