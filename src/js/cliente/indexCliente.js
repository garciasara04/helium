document.addEventListener("DOMContentLoaded", () => {

  iniciarAnimaciones();

  animarHero(); // NUEVA animación del hero

});


/* ================================
   ANIMACIÓN HERO PRINCIPAL
================================ */

function animarHero(){

  const titulo = document.querySelector("section h2");
  const texto = document.querySelector("section p");
  const boton = document.querySelector("section a");

  if(!titulo || !texto || !boton) return;

  animarTitulo(titulo);
  animarTexto(texto);
  animarBoton(boton);

}


/* ================================
   ANIMAR TITULO LETRA POR LETRA
================================ */

function animarTitulo(elemento){

  const texto = elemento.textContent.trim();
  elemento.textContent = "";

  texto.split("").forEach((letra,index)=>{

    const span = document.createElement("span");

    // mantener los espacios
    span.innerHTML = letra === " " ? "&nbsp;" : letra;

    span.style.opacity = "0";
    span.style.display = "inline-block";
    span.style.transform = "translateY(20px)";

    span.style.transition =
      "opacity 0.5s ease, transform 0.5s ease";

    span.style.transitionDelay = `${index * 40}ms`;

    elemento.appendChild(span);

    setTimeout(()=>{

      span.style.opacity = "1";
      span.style.transform = "translateY(0)";

    },100);

  });

}


/* ================================
   ANIMACIÓN TEXTO TIPO ESCRITURA
================================ */

function animarTexto(elemento){

  const texto = elemento.textContent.trim();
  elemento.textContent = "";

  let index = 0;

  function escribir(){

    if(index < texto.length){

      elemento.textContent += texto.charAt(index);
      index++;

      setTimeout(escribir,25);

    }

  }

  setTimeout(escribir,800);

}


/* ================================
   ANIMACIÓN BOTÓN HERO
================================ */

function animarBoton(boton){

  boton.style.opacity = "0";
  boton.style.transform = "translateY(20px) scale(0.9)";
  boton.style.transition =
    "all 0.6s ease";

  setTimeout(()=>{

    boton.style.opacity = "1";
    boton.style.transform = "translateY(0) scale(1)";

  },1200);


  /* Hover dinámico */

  boton.addEventListener("mouseenter",()=>{

    boton.style.transform = "translateY(-4px) scale(1.05)";
    boton.style.boxShadow =
      "0 15px 35px rgba(168,85,247,0.6)";

  });

  boton.addEventListener("mouseleave",()=>{

    boton.style.transform = "translateY(0) scale(1)";
    boton.style.boxShadow =
      "0 10px 25px rgba(0,0,0,0.3)";

  });

}



/* ================================
   OBSERVADOR PARA ANIMACIONES
================================ */

function iniciarAnimaciones(){

  const observer = new IntersectionObserver((entries)=>{

    entries.forEach(entry=>{

      if(entry.isIntersecting){

        entry.target.classList.add("animar");

      }

    });

  },{
    threshold:0.15
  });

  observarElementos(observer);

}


/* ================================
   OBSERVAR TARJETAS DINÁMICAS
================================ */

function observarElementos(observer){

  const contenedores = [
    "#contenedor-freelancers",
    "#contenedor-servicios",
    "#contenedor-proyectos"
  ];

  contenedores.forEach(selector => {

    const contenedor = document.querySelector(selector);

    if(!contenedor) return;

    const observerInterno = new MutationObserver(()=>{

      const cards = contenedor.children;

      [...cards].forEach((card,index)=>{

        card.classList.add("card-animada");

        card.style.transitionDelay = `${index * 120}ms`;

        observer.observe(card);

        agregarHover(card);

      });

      animarProgreso();

    });

    observerInterno.observe(contenedor,{
      childList:true
    });

  });

}


/* ================================
   ANIMAR BARRAS DE PROGRESO
================================ */

function animarProgreso(){

  const barras = document.querySelectorAll("#contenedor-proyectos div[style*='width']");

  barras.forEach(barra=>{

    const anchoFinal = barra.style.width;

    barra.style.width = "0%";

    setTimeout(()=>{

      barra.style.transition = "width 1.2s ease";

      barra.style.width = anchoFinal;

    },200);

  });

}


/* ================================
   EFECTO HOVER DINÁMICO
================================ */

function agregarHover(card){

  card.addEventListener("mouseenter",()=>{

    card.style.transform = "translateY(-8px) scale(1.02)";
    card.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4)";

  });

  card.addEventListener("mouseleave",()=>{

    card.style.transform = "translateY(0) scale(1)";
    card.style.boxShadow = "";

  });

}