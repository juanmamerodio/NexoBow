
window.addEventListener("DOMContentLoaded", (event) => {
  let sectionProject = document.querySelector('.container_slider_project');
  let triggerProject = document.querySelector('.trigger_section_project');


  let mm = gsap.matchMedia();

  mm.add("(min-width: 2560px)", () => {
   // Animation for screens with a width of 2560 px and higher
    gsap.set(sectionProject, {
      scale: 0.8,
      borderRadius: "2.5rem", 
    });

    gsap.to(sectionProject, {
      scale: 1,
      borderRadius: "2.5rem",
      duration: 0.5,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: triggerProject,
        start: 'top 85%',
        end: 'bottom 20%',
        scrub: true,
        markers: false,
      },
    });
  });

  mm.add("(max-width: 2559px)", () => {
    // Animation for screens less than 2560 px
    gsap.set(sectionProject, {
      scale: 0.8,
      borderRadius: "2.5rem", 
    });

    gsap.to(sectionProject, {
      scale: 1,
      borderRadius: "0rem",
      duration: 0.5,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: triggerProject,
        start: 'top 85%',
        end: 'bottom 20%',
        scrub: true,
        markers: false,
      },
    });
  });
});

