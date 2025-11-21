const carousel = document.querySelector('.carousel');
document.querySelector('.scroll-right').addEventListener('click', () => {
    carousel.scrollBy({ left: 300, behavior: 'smooth' });
});
document.querySelector('.scroll-left').addEventListener('click', () => {
    carousel.scrollBy({ left: -300, behavior: 'smooth' });
});
