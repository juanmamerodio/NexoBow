
window.addEventListener("DOMContentLoaded", (event) => {
  let section = document.querySelector('.wrap_content_footer');
  let triggerSection = document.querySelector('.trigger_footer');


  gsap.set(section, {
    opacity: 0,
    y: "80%",
  });

 
  gsap.to(section, {
    opacity: 1,
    y: "0%",
    ease: 'power2.out',
    scrollTrigger: {
      trigger: triggerSection,
      start: "top bottom", 
      end: "top 50%",      
      scrub: 2,           
      markers: false        
    }
  });
});
