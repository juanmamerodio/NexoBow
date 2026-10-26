
document.querySelectorAll('[animate]').forEach((element) => {

  new SplitType(element, {
    types: 'lines, words, chars',
    tagName: 'span',
  });


  gsap.from(element.querySelectorAll('.line'), {
    y: '100%',
    opacity: 0,
    duration: 1.25,
    ease: 'power1.out',
    stagger: 0.25,
    scrollTrigger: {
      trigger: element,
      start: 'top 75%',
    },
  });
});

