
document.addEventListener("DOMContentLoaded", () => {

  $(".section_slider_project").each(function (index) {

   const bgSwiper = new Swiper($(this).find(".swiper.is-project")[0], {
      slidesPerView: "auto",
      spaceBetween: "10%",
       effect: "fade",
       allowTouchMove: false,
       
      a11y: {
      enabled: true,
      containerRoleDescriptionMessage: 'carousel',
      itemRoleDescriptionMessage: 'slide', 
      slideRole: 'listitem',
       },
       
    });
    
    const smallSwiper = new Swiper($(this).find(".swiper.is-small-project")[0], {
      slidesPerView: 5,
      spaceBetween: 10,
      slideToClickedSlide: true,
      
      a11y: {
        enabled: true,
       containerRoleDescriptionMessage: 'carousel',
       itemRoleDescriptionMessage: 'slide', 
       slideRole: 'listitem',
      },
      
    });

    const textSwiper = new Swiper($(this).find(".swiper.is-project-text")[0], {
      loop: true,
      speed: 400,
      effect: "coverflow",
         coverflowEffect: {
         rotate: 0,          
         stretch: 0,         
         depth: 100,        
         modifier: 1,        
         scale: 0.9,         
         slideShadows: false, 
     },
      allowTouchMove: false,
      touchStartPreventDefault: false,
      touchStartForcePreventDefault: false,
      nested: true,
      spaceBetween: "10%",
      thumbs: {
        swiper: smallSwiper,
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
      disabledClass: "is-disabled"
    },
    
    a11y: {
      enabled: true,
      containerRoleDescriptionMessage: 'carousel',
      itemRoleDescriptionMessage: 'slide', 
      slideRole: 'listitem',
    },
   
    slideActiveClass: "is-active",
    slideDuplicateActiveClass: "is-active",
    
    });
  
   textSwiper.on('slideChange', function () {
    const realIndex = textSwiper.realIndex;
    bgSwiper.slideTo(realIndex);
   });

  });


});
