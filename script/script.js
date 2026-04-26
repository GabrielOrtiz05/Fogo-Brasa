// Interatividade do Menu Mobile
const menuToggle = document.getElementById('mobile-menu');
const navList = document.querySelector('.nav-list');

menuToggle.addEventListener('click', () => {
    navList.classList.toggle('active');
});

// Ação do botão de reserva
function fazerReserva() {
    alert("Obrigado pelo interesse! Nosso sistema de reservas online estará disponível em breve. Por favor, ligue para (11) 99999-9999 para garantir sua mesa.");
}

// Fechar menu mobile ao clicar em um link
const navLinks = document.querySelectorAll('.nav-list a');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (navList.classList.contains('active')) {
            navList.classList.remove('active');
        }
    });
});