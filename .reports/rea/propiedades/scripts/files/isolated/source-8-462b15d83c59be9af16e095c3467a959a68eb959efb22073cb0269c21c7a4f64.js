
if (document.querySelector('.wrap_trigger_bg_nav')) {
  ScrollTrigger.matchMedia({
    "(min-width: 992px)": function () {
      ScrollTrigger.create({
        trigger: ".wrap_trigger_bg_nav",
        start: "bottom 72px",
        onEnter: () => {
          document.querySelector('.bg_drop_menu_black').classList.add('is-active');
        },
        onLeaveBack: () => {
          document.querySelector('.bg_drop_menu_black').classList.remove('is-active');
        }
      });
    }
  });

  ScrollTrigger.create({
    trigger: ".wrap_trigger_bg_nav",
    start: "bottom 72px",
    onEnter: () => {
      document.querySelector('.bg_nav_bar').classList.add('is-active');
    },
    onLeaveBack: () => {
      document.querySelector('.bg_nav_bar').classList.remove('is-active');
    }
  });
} else {
  if (window.matchMedia("(min-width: 992px)").matches) {
    document.querySelector('.bg_drop_menu_black').classList.add('is-active');
  }
  document.querySelector('.bg_nav_bar').classList.add('is-active');
}

