// ── Fix Simulator knowledge base ──
// Curated for the most common axe-core rules. Keyed by axe-core's rule `id`.
// Each entry: a relatable fact/analogy + WCAG "why" reference + a corrected code example.
const FIX_DATA = {
  'image-alt': {
    fact: "Imagine ek news article parh rahe ho jisme har image ki jagah sirf 'image' likha ho — yehi experience screen reader user ko hota hai bina alt text ke.",
    why: 'WCAG 1.1.1 (Level A) — har non-text content ka text alternative hona zaroori hai.',
    fixedExample: '<img src="cat.jpg" alt="A sleeping orange cat curled up on a windowsill">'
  },
  'color-contrast': {
    fact: "Ye waisa hi hai jaise dhoop mein phone ki screen kam brightness pe parhna — sab ke liye mushkil hoti hai, kuch logon ke liye namumkin.",
    why: 'WCAG 1.4.3 (Level AA) — normal text ka contrast ratio kam az kam 4.5:1 hona chahiye.',
    fixedExample: '<p style="color:#1a1a1a; background-color:#ffffff;">\n  Readable text with strong contrast\n</p>'
  },
  'label': {
    fact: "Bina label ke form field aisi hai jaise koi bina naam ke khaali dabba pakra de aur kahe 'isme apna email daalo' — pata hi nahi konsa dabba kis cheez ka hai.",
    why: 'WCAG 1.3.1 / 4.1.2 (Level A) — form fields ka programmatically associated label hona zaroori hai.',
    fixedExample: '<label for="email">Email address</label>\n<input type="email" id="email" name="email">'
  },
  'link-name': {
    fact: "'Click here' jaisa link screen reader user ke liye kuch matlab nahi rakhta — wo sirf 'link, click here' sunta hai, pata nahi chalta kahan jaa raha hai.",
    why: 'WCAG 2.4.4 (Level A) — har link ka accessible naam hona zaroori hai jo uska purpose batae.',
    fixedExample: '<a href="/report.pdf">Download the 2026 accessibility report (PDF)</a>'
  },
  'html-has-lang': {
    fact: "Bina lang attribute ke screen reader ko pata nahi chalta page kis language mein hai — wo galat pronunciation/accent use kar sakta hai.",
    why: 'WCAG 3.1.1 (Level A) — page ki primary language declare karna zaroori hai.',
    fixedExample: '<html lang="en">'
  },
  'document-title': {
    fact: "Page title browser tab aur screen reader dono ke liye pehli cheez hai jo suni jati hai — bina iske user confuse hota hai ke kahan hai.",
    why: 'WCAG 2.4.2 (Level A) — har page ka descriptive title hona chahiye.',
    fixedExample: '<title>Contact Us — AccessiCheck</title>'
  },
  'landmark-one-main': {
    fact: "Bina main landmark ke, screen reader user pure page ko top se bottom parhta hai — jaise kisi kitab mein chapter headings hi na hon.",
    why: 'ARIA best practice — page mein exactly ek <main> landmark hona chahiye taake navigation clear ho.',
    fixedExample: '<main>\n  <!-- page ka core content yahan -->\n</main>'
  },
  'region': {
    fact: "Landmarks (header/nav/main/footer) ek map ki tarah hain — screen reader user inhi se jump karke seedha relevant section pe pohonchta hai.",
    why: 'ARIA best practice — saara visible content kisi landmark ke andar hona chahiye.',
    fixedExample: '<header>...</header>\n<nav>...</nav>\n<main>...</main>\n<footer>...</footer>'
  },
  'button-name': {
    fact: "Khaali button (sirf icon, koi text nahi) screen reader pe sirf 'button' bolta hai — user ko pata hi nahi chalta wo kya karega.",
    why: 'WCAG 4.1.2 (Level A) — har interactive control ka accessible naam hona zaroori hai.',
    fixedExample: '<button aria-label="Close menu">\n  <svg aria-hidden="true">...</svg>\n</button>'
  },
  'frame-title': {
    fact: "Bina title ke iframe screen reader pe sirf 'frame' sunai deta hai — user ko nahi pata andar kya hai (video? form? ad?).",
    why: 'WCAG 2.4.1 / 4.1.2 — har iframe ka descriptive title hona chahiye.',
    fixedExample: '<iframe src="video.html" title="Product demo video"></iframe>'
  }
};

// Fallback for any rule not in the curated list above — every field is filled,
// the modal must never show an empty box.
const FIX_DATA_GENERIC = {
  fact: 'Har accessibility fix chhota lagta hai, lekin kisi na kisi user ke liye "use kar paana" aur "bilkul use na kar paana" ke beech ka farq banata hai.',
  why: 'Ye issue WCAG guidelines ke against jata hai — neeche "Learn more" link pe poori official detail mil jayegi.',
  fixedExample: ''
};