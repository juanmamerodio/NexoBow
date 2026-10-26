
document.addEventListener("DOMContentLoaded", () => {
  // Safety net (2026-10-12): if the animation library failed to load, show the page right away
  if (typeof gsap === "undefined") {
    document.querySelectorAll(".page_main, .nav_bar").forEach((el) => (el.style.opacity = 1));
    const ld = document.querySelector(".wrap_loader");
    if (ld) ld.style.display = "none";
    return;
  }

  // Full intro only on a visitor's very first visit (2026-10-12: localStorage instead of sessionStorage)
  let hasVisited = null;
  try { hasVisited = localStorage.getItem("lufteIntroSeen"); } catch (e) {}

  if (!hasVisited) {
    startPageAnimation();
    try { localStorage.setItem("lufteIntroSeen", "true"); } catch (e) {}
  } else {
    skipAnimation();
  }
});

function startPageAnimation() {
  document.body.style.overflow = 'hidden';

  const tl = gsap.timeline({
    delay: 0,
    onComplete: () => {
      document.body.style.overflow = '';
    }
  });

// Setting the initial values for the elements
  gsap.set(".container_loader_column.top .row", { y: "-50%" });
  gsap.set(".container_loader_column.bottom .row", { y: "50%" });
  gsap.set(".container_loader_column.centr", { scale: 0 });
  //gsap.set(".wrap_bg_section_h", { opacity: 0 });
  gsap.set(".bg_loader", { opacity: 1 });
  gsap.set(".nav_bar", { opacity: 0 });
  gsap.set(".wrap_title_bn_h_m", { opacity: 0 });
  gsap.set(".section_statistic", { opacity: 0 });
  gsap.set(".page_main", { opacity: 0 });

  gsap.set(".wrap_loader", { opacity:0 }); 
  gsap.to(".wrap_loader", {
  opacity: 1,
  duration: 0.3, 
  onComplete: () => {
    document.querySelector(".wrap_loader").style.display = "block";
  }
});
  

 // Animation for .container_loader_column .centr
  tl.to(".container_loader_column.centr", {
    scale: 1,
    duration: 3,         
    ease: "power4.inOut"
  });


// Animation for lines inside .centr with individual offsets for the first and last
  tl.to(".container_loader_column.centr .row", {
    x: (index, target, targets) => {
    
      if (index === 0) {
        return "-25%";
      }
    
      if (index === targets.length - 1) {
        return "25%";
      }
     
      return "0%";
    },
    opacity: 1,
    //stagger: 0.25, 
    duration: 3,      
    ease: "power4.inOut"
  }, "-=1.5");


// Animation for .container_loader_column.top from 0% to 0%
  tl.to(".container_loader_column.top", {
    x: "0%",
    duration: 3,         
    ease: "power4.inOut"
  }, "-=2.5");

 // Animation for the lines inside .top, with a return to 0% after 1 second
  tl.to(".container_loader_column.top .row", {
    x: (index, target, targets) => {
  
      if (index === 0) {
        return "-35%";
      }
     
      if (index === targets.length - 1) {
        return "15%";
      }
     
      return "-10%";
    },
    stagger: 0.25, 
    duration: 3,      
    ease: "power4.inOut"
  }, "-=3.5");
  
    // Animation for .container_loader_column.top from 0% to 0%
  tl.to(".container_loader_column.bottom", {
    x: "0%",
    duration: 3,         
    ease: "power4.inOut"
  }, "-=2.5");

  // Animation for the lines inside .top, with a return to 0% after 1 second
  tl.to(".container_loader_column.bottom .row", {
    x: (index, target, targets) => {
     
      if (index === 0) {
        return "-15%";
      }
    
      if (index === targets.length - 1) {
        return "35%";
      }
      
      return "10%";
    },
    stagger: 0.25, 
    duration: 3,      
    ease: "power4.inOut"
  }, "-=3.5");


  tl.to(".container_loader_column.centr .row", {
    x: "0%",         
    //stagger: 0.25, 
    duration: 2,      
    ease: "power4.inOut"
  });  

  tl.to(".container_loader_column.top .row", {
    x: "0%",
    y: "0%",
    //stagger: 0.25, 
    duration: 2,     
    ease: "power4.inOut"
  },"-=2");
  
    tl.to(".container_loader_column.bottom .row", {
    x: "0%",
    y: "0%",
    //stagger: 0.25, 
    duration: 2,      
    ease: "power4.inOut"
  },"-=2");
  
   tl.to(".wrap_loader", {
    scale: 3.25,
    stagger: 0.25, 
    duration: 2, 
    ease: "power4.inOut"
  },"+=1");
  
  
   tl.to(".container_loader_column.top", {
    y: "-150%",
    stagger: 0.25, 
    duration: 3,      
    ease: "power4.inOut"
  }, "-=2.5");
  
   tl.to(".container_loader_column.bottom", {
    y: "150%",
    stagger: 0.25, 
    duration: 3,      
    ease: "power4.inOut"
  }, "-=3");
  
  tl.to(".container_loader_column.centr .row", {
  scale: (index, target, targets) => {
    if (index === 0 || index === targets.length - 1) {
      return 0.5; 
    }
    return 1; 
  },
  //stagger: 0.25, 
  duration: 3,      
  ease: "power4.inOut"
}, "-=3");

 tl.to(".wrap_loader", {
    opacity: 0,
    duration: 1.5, 
    ease: "power4.inOut",
    onComplete: () => {
        gsap.set(".wrap_loader", { display: "none" });
    }
},"-=0.5");

  tl.to(".page_main", {
   opacity: 1,
   duration: 3,      
   ease: "power4.inOut"
  },"-=2");

 
 tl.to(".nav_bar", {
  opacity: 1,
  duration: 3,      
  ease: "power4.inOut"
  },"-=2");
  
  tl.to(".wrap_title_bn_h_m", {
  opacity: 1,
  duration: 2,      
  ease: "power4.inOut"
  },"-=2");
  
  tl.to(".section_statistic", {
  opacity: 1,
  duration: 2,      
  ease: "power4.inOut"
  },"-=2");

  console.log("Starting the page loading animation");
}

function skipAnimation() {
  const tl = gsap.timeline();
  document.querySelector(".wrap_loader").style.display = "none";
  gsap.set(".page_main", { opacity: 0 });
  gsap.set(".nav_bar", { opacity: 0 });
  gsap.set(".wrap_title_bn_h_m", { opacity: 0 });
  gsap.set(".section_statistic", { opacity: 0 });
  
  tl.to(".page_main", {
   opacity: 1,
   duration: 3,      
   ease: "power4.inOut"
  });

  tl.to(".nav_bar", {
  opacity: 1,
  duration: 3,      
  ease: "power4.inOut"
  },"-=2");
  
  tl.to(".wrap_title_bn_h_m", {
  opacity: 1,
  duration: 2,      
  ease: "power4.inOut"
  },"-=2");
  
  tl.to(".section_statistic", {
  opacity: 1,
  duration: 2,      
  ease: "power4.inOut"
  },"-=2");
  
  
  console.log("Анимация пропущена");
}

