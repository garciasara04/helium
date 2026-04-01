document.addEventListener("DOMContentLoaded", () => {

  const btnRegister = document.getElementById("btn-register");
  const btnLogin = document.getElementById("btn-login");

  const token = localStorage.getItem("token");

  async function validateTokenAndRedirect() {
    if (!token) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/profile", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        window.location.href = "/dashboard";
        return;
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  validateTokenAndRedirect();

  btnRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/Register";
  });

  btnLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/Login";
  });


  /* =================================================
      HERO
  ================================================= */

  const hero = document.querySelector("section");
  const heroTitle = hero?.querySelector("h1");
  const paragraph = hero?.querySelector("p");
  const buttons = hero?.querySelectorAll("a");

  if (heroTitle) {

    const heroText = heroTitle.innerText;
    heroTitle.innerHTML = "";

    heroText.split("").forEach((letter, index) => {

      const span = document.createElement("span");

      if (letter === " ") {
        span.innerHTML = "&nbsp;";
      } else {
        span.innerText = letter;
      }

      span.style.display = "inline-block";
      span.style.opacity = "0";
      span.style.transform = "translateY(-40px)";
      span.style.transition = "all 0.5s ease";

      heroTitle.appendChild(span);

      setTimeout(() => {
        span.style.opacity = "1";
        span.style.transform = "translateY(0)";
      }, index * 40);

    });

  }

  if (paragraph) {

    paragraph.style.opacity = "0";
    paragraph.style.transform = "translateY(30px)";
    paragraph.style.transition = "all 1s ease";

    setTimeout(() => {
      paragraph.style.opacity = "1";
      paragraph.style.transform = "translateY(0)";
    }, 1200);

  }

  buttons?.forEach((btn, i) => {

    btn.style.opacity = "0";
    btn.style.transform = "scale(0.8)";
    btn.style.transition = "all 0.4s ease";

    setTimeout(() => {
      btn.style.opacity = "1";
      btn.style.transform = "scale(1)";
    }, 1600 + (i * 200));

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.08)";
      btn.style.boxShadow = "0 10px 25px rgba(168,85,247,0.6)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "none";
    });

  });



  /* =================================================
      CAROUSEL VIEWS (ANIMACIÓN AL HACER SCROLL)
  ================================================= */

  const carouselSection = document.querySelector("section.bg-slate-950");
  const carouselTitle = carouselSection?.querySelector("h2");
  const cards = carouselSection?.querySelectorAll(".grid > div");

  const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {

        if (carouselTitle) {

          const text = carouselTitle.innerText;
          carouselTitle.innerHTML = "";

          text.split("").forEach((letter, index) => {

            const span = document.createElement("span");

            if (letter === " ") {
              span.innerHTML = "&nbsp;";
            } else {
              span.innerText = letter;
            }

            span.style.display = "inline-block";
            span.style.opacity = "0";
            span.style.transform = "translateY(-50px)";
            span.style.transition = "all 0.4s ease";

            carouselTitle.appendChild(span);

            setTimeout(() => {

              span.style.opacity = "1";
              span.style.transform = "translateY(0)";
              span.style.color = "#a855f7";

              setTimeout(() => {
                span.style.color = "#f1f5f9";
              }, 500);

            }, index * 60);

          });

        }

        cards?.forEach((card, i) => {

          card.style.opacity = "0";
          card.style.transform = "translateY(40px)";
          card.style.transition = "all 0.4s ease";

          setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          }, 800 + (i * 200));

          card.addEventListener("mouseenter", () => {

            card.style.transform = "scale(1.05)";
            card.style.borderColor = "#a855f7";
            card.style.boxShadow = "0 15px 35px rgba(168,85,247,0.4)";

          });

          card.addEventListener("mouseleave", () => {

            card.style.transform = "scale(1)";
            card.style.borderColor = "#1e293b";
            card.style.boxShadow = "none";

          });

        });

        observer.unobserve(carouselSection);

      }

    });

  }, { threshold: 0.3 });

  if (carouselSection) {
    observer.observe(carouselSection);
  }



  /* =================================================
      SERVICES (ANIMACIÓN AL HACER SCROLL)
  ================================================= */

  const servicesSections = document.querySelectorAll("section.bg-slate-950");
  const servicesSection = servicesSections[1];

  const servicesTitle = servicesSection?.querySelector("h2");
  const serviceCards = servicesSection?.querySelectorAll(".grid > div");

  const servicesObserver = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {

        if (servicesTitle) {

          servicesTitle.style.opacity = "0";
          servicesTitle.style.transform = "translateY(40px)";
          servicesTitle.style.transition = "all 0.8s ease";

          setTimeout(() => {
            servicesTitle.style.opacity = "1";
            servicesTitle.style.transform = "translateY(0)";
          }, 200);

        }

        serviceCards?.forEach((card, i) => {

          card.style.opacity = "0";
          card.style.transform = "translateY(60px)";
          card.style.filter = "blur(6px)";
          card.style.transition = "all 0.6s ease";

          setTimeout(() => {

            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
            card.style.filter = "blur(0px)";

          }, 300 + (i * 200));

          card.addEventListener("mouseenter", () => {

            card.style.transform = "scale(1.06)";
            card.style.borderColor = "#a855f7";
            card.style.boxShadow = "0 20px 40px rgba(168,85,247,0.35)";

          });

          card.addEventListener("mouseleave", () => {

            card.style.transform = "scale(1)";
            card.style.borderColor = "#1e293b";
            card.style.boxShadow = "none";

          });

        });

        servicesObserver.unobserve(servicesSection);

      }

    });

  }, { threshold: 0.3 });

  if (servicesSection) {
    servicesObserver.observe(servicesSection);
  }

/* =================================================
   CTA BOTON SALTANDO
================================================= */

const ctaButton = document.querySelector('a[href="/Register"]');

if (ctaButton) {

  const style = document.createElement("style");

  style.innerHTML = `
  @keyframes ctaBounce {
    0% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
    100% { transform: translateY(0); }
  }

  a[href="/Register"]{
    animation: ctaBounce 0.9s infinite ease-in-out;
    display:inline-block;
  }
  `;

  document.head.appendChild(style);


}

});
