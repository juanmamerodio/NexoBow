

window.addEventListener("DOMContentLoaded", (event) => {
  let section = document.querySelector('.section_statistic');
  let triggerSection = document.querySelector('.trigger_section');


  gsap.set(section, {
    scale: 0.8,
    borderRadius: "2.5rem",
  });


  gsap.to(section, {
    scale: 1,
    borderRadius: "0rem",
    duration: 0.5,
    ease: 'power1.out',
    scrollTrigger: {
      trigger: triggerSection,
      start: 'top bottom',
      end: 'bottom 50%',
      scrub: true,
      markers: false
    }
  });

});

