const carousel = document.querySelector('.carousel');
document.querySelector('.scroll-right').addEventListener('click', () => {
    carousel.scrollBy({ left: 360, behavior: 'smooth' });
});
document.querySelector('.scroll-left').addEventListener('click', () => {
    carousel.scrollBy({ left: -360, behavior: 'smooth' });
});
