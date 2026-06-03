document.getElementById('year').textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('seen');
  }
}, { threshold: 0.12 });

document.querySelectorAll('section, article').forEach((el) => observer.observe(el));
