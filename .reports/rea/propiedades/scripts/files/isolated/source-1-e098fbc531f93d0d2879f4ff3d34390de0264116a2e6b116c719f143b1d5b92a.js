
document.addEventListener("DOMContentLoaded", () => {
  $(".wrap_slider_statistic").each(function () {
    // Элементы навигации
    const options = document.querySelectorAll(".nav-option");
    const circle = document.querySelector(".circle-indicator");
    const totalSlides = options.length;

    // Variable for tracking the current angle
    let currentRotation = 0;
    let previousIndex = 0;

   // Function to rotate the circle to the desired position
    function rotateCircleToPosition(activeIndex) {
      const rotationStep = 360 / totalSlides;
      let direction = activeIndex - previousIndex;

     
      if (direction > totalSlides / 2) {
        direction -= totalSlides; // Reverse movement
      } else if (direction < -totalSlides / 2) {
        direction += totalSlides; // Direct movement
      }

      currentRotation += direction * rotationStep;
      circle.style.transform = `rotate(${currentRotation}deg)`;

      previousIndex = activeIndex; 
    }

    function setActiveOption(index) {
      options.forEach((option) => {
        const optionIndex = parseInt(option.getAttribute("data-index"), 10);
        option.classList.toggle("active", optionIndex === index);
      });
    }

    
    const swiperStatistic = new Swiper($(this).find(".swiper.is-statistic")[0], {
      slidesPerView: "auto",
      initialSlide: 1,
      loop: true,
      speed: 500,
      effect: "fade",
      fadeEffect: {
        crossFade: true,
      },

      pagination: {
        el: $(this).find(".swiper-bullet-wrapper")[0],
        bulletActiveClass: "is-active",
        bulletClass: "swiper-bullet",
        bulletElement: "button",
        clickable: true,
      },
      navigation: {
        nextEl: $(this).find(".swiper-next")[0],
        prevEl: $(this).find(".swiper-prev")[0],
        disabledClass: "is-disabled",
      },

      a11y: {
        enabled: true,
        containerRoleDescriptionMessage: "carousel",
        itemRoleDescriptionMessage: "slide",
        slideRole: "listitem",
      },

      slideActiveClass: "is-active",
      slideDuplicateActiveClass: "is-active",

    
      on: {
        slideChange: function () {
          const activeIndex = this.realIndex;
          rotateCircleToPosition(activeIndex);
          setActiveOption(activeIndex);
        },
      },
    });

  
    options.forEach((option) => {
      const index = parseInt(option.getAttribute("data-index"), 10);
      option.addEventListener("click", () => {
        swiperStatistic.slideToLoop(index); // Go to the slide
        rotateCircleToPosition(index);
        setActiveOption(index);
      });
    });

   
    setActiveOption(swiperStatistic.realIndex);
  });
});
