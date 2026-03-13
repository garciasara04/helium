document.addEventListener("DOMContentLoaded", () => {

  const groups = document.querySelectorAll(".group");

  groups.forEach(group => {

    const dropdown = group.querySelector(".absolute");
    if (!dropdown) return;

    const skills = dropdown.querySelectorAll("li");

    let timeout;

    // estado inicial
    skills.forEach(skill => {
      skill.style.opacity = "0";
      skill.style.transform = "translateY(-5px)";
      skill.style.transition = "opacity .25s ease, transform .25s ease";
    });

    group.addEventListener("mouseenter", () => {

      clearTimeout(timeout);

      skills.forEach((skill, index) => {

        setTimeout(() => {
          skill.style.opacity = "1";
          skill.style.transform = "translateY(0)";
        }, index * 40); // efecto cascada

      });

    });

    group.addEventListener("mouseleave", () => {

      timeout = setTimeout(() => {

        skills.forEach(skill => {
          skill.style.opacity = "0";
          skill.style.transform = "translateY(-5px)";
        });

      }, 150);

    });

    dropdown.addEventListener("mouseenter", () => {
      clearTimeout(timeout);
    });

  });

});