
document.addEventListener("DOMContentLoaded", () => {

 $(".section_partners").each(function (index) {

  const swiperParthers = new Swiper($(this).find(".swiper.is-parthers")[0], {
    slidesPerView: "auto",
    speed: 500,
    spaceBetween: 12,
    
    pagination: {
      el: $(this).find(".swiper-bullet-wrapper")[0],
      bulletActiveClass: "is-active",
      bulletClass: "swiper-bullet-experience",
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
    slideDuplicateActiveClass: "is-active"
    
   });

 });

}); 
