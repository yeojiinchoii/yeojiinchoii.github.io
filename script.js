// let myEle = document.getElementsByClassName("back-to-top-link");

// window.onscroll = function () {
//   scrollFunction();
// };

// function scrollFunction() {
//   if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
//     myEle[0].style.display = "block";
//   } else {
//     myEle[0].style.display = "none";
//   }
// }

// function topFunction() {
//   document.body.scrollTop = 0;
//   document.documentElement.scrollTop = 0;
// }


window.onscroll = () => {
  toggleTopButton();
}
function scrollToTop(){
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function placeBackToTop() {
  const backToUp = document.getElementById('back-to-up');
  const footer = document.querySelector('footer');
  if (!backToUp || !footer) {
    return;
  }
  const gap = 12;
  const footerHeight = Math.ceil(footer.getBoundingClientRect().height);
  backToUp.style.bottom = `${footerHeight + gap}px`;
}

function toggleTopButton() {
  const backToUp = document.getElementById('back-to-up');
  if (!backToUp) {
    return;
  }
  placeBackToTop();
  if (document.body.scrollTop > 20 ||
      document.documentElement.scrollTop > 20) {
    backToUp.classList.remove('d-none');
  } else {
    backToUp.classList.add('d-none');
  }
}

function setNavOpen(nav, open) {
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('nav-open', open);
  const toggle = nav.querySelector('.nav-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function initAboutManifest() {
  const nodes = Array.from(document.querySelectorAll('[data-about-manifest]'));
  if (!nodes.length) {
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const splitChars = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement && node.parentElement.closest('.name-say')) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue && node.nodeValue.trim().length
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      Array.from(textNode.nodeValue || '').forEach((char) => {
        if (/\s/.test(char)) {
          fragment.appendChild(document.createTextNode(char));
          return;
        }
        const span = document.createElement('span');
        span.className = 'about-char';
        span.textContent = char;
        span.setAttribute('aria-hidden', 'true');
        fragment.appendChild(span);
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  };

  const getVisibleIntroCount = (chars) => {
    const lines = [];
    chars.forEach((char, index) => {
      const rect = char.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        return;
      }
      const lineTop = Math.round(rect.top / 4) * 4;
      const lastLine = lines[lines.length - 1];
      if (lastLine && Math.abs(lastLine.top - lineTop) <= 4) {
        lastLine.lastIndex = index;
        return;
      }
      lines.push({ top: lineTop, lastIndex: index });
    });
    if (!lines.length) {
      return 0;
    }
    const targetLine = lines[Math.min(2, lines.length) - 1];
    return targetLine ? targetLine.lastIndex + 1 : 0;
  };

  const manifests = [];

  nodes.forEach((node) => {
    const section = node;
    node.setAttribute('aria-label', (node.textContent || '').replace(/\s+/g, ' ').trim());
    splitChars(node);
    const chars = Array.from(node.querySelectorAll('.about-char'));
    if (reduced) {
      chars.forEach((char) => char.classList.add('is-active'));
      return;
    }
    if (chars.length) {
      manifests.push({
        section,
        chars,
        introCount: 0,
        scrollCount: 0,
        timers: [],
      });
    }
  });

  if (!manifests.length) {
    return;
  }

  const applyActiveCount = (manifest) => {
    const activeCount = Math.max(manifest.introCount, manifest.scrollCount);
    manifest.chars.forEach((char, index) => {
      char.classList.toggle('is-active', index < activeCount);
    });
  };

  const update = () => {
    const trigger = window.innerHeight * 0.78;
    manifests.forEach((manifest) => {
      let count = 0;
      for (let i = 0; i < manifest.chars.length; i += 1) {
        if (manifest.chars[i].getBoundingClientRect().top < trigger) {
          count = i + 1;
        } else {
          break;
        }
      }
      manifest.scrollCount = count;
      applyActiveCount(manifest);
    });
  };

  let raf = 0;
  const requestUpdate = () => {
    if (raf) {
      return;
    }
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };

  manifests.forEach((manifest) => {
    const introCount = getVisibleIntroCount(manifest.chars);
    manifest.chars.slice(0, introCount).forEach((_, index) => {
      const timer = window.setTimeout(() => {
        manifest.introCount = Math.max(manifest.introCount, index + 1);
        applyActiveCount(manifest);
      }, index * 16);
      manifest.timers.push(timer);
    });
  });

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  requestUpdate();
}

function initNamePronunciation() {
  const buttons = Array.from(document.querySelectorAll('.name-say'));
  if (!buttons.length) {
    return;
  }

  const audio = new Audio('audio/yeojin.wav');
  audio.preload = 'auto';

  const setPlaying = (playing) => {
    buttons.forEach((button) => {
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', playing ? 'true' : 'false');
    });
  };

  const speakFallback = () => {
    if (!window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance('여진');
    utter.lang = 'ko-KR';
    utter.rate = 0.88;
    utter.onend = () => setPlaying(false);
    window.speechSynthesis.speak(utter);
  };

  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        return;
      }

      setPlaying(true);
      audio.currentTime = 0;
      audio.play().catch(() => {
        speakFallback();
      });
    });
  });

  audio.addEventListener('ended', () => setPlaying(false));
  audio.addEventListener('error', speakFallback);
}

function initSequenceCarousels() {
  document.querySelectorAll('[data-sequence-carousel]').forEach((root) => {
    const scroller = root.querySelector('.asset-ph-sequence');
    const prev = root.querySelector('[data-dir="-1"]');
    const next = root.querySelector('[data-dir="1"]');
    const dotsWrap = root.querySelector('.sequence-dots');
    if (!scroller || !prev || !next || !dotsWrap) {
      return;
    }

    const items = Array.from(scroller.children);
    if (items.length < 2) {
      return;
    }

    let active = 0;
    let moving = false;
    let restoreTimer = 0;

    const maxScrollLeft = () => Math.max(0, scroller.scrollWidth - scroller.clientWidth);

    const offsetOf = (item) =>
      item.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;

    const targetLeft = (index) => {
      if (index <= 0) {
        return 0;
      }
      if (index >= items.length - 1) {
        return maxScrollLeft();
      }
      return Math.min(Math.max(0, offsetOf(items[index])), maxScrollLeft());
    };

    const currentIndex = () => {
      const origin = scroller.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;
      items.forEach((item, index) => {
        const dist = Math.abs(item.getBoundingClientRect().left - origin);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      if (scroller.scrollLeft >= maxScrollLeft() - 8) {
        return items.length - 1;
      }
      if (scroller.scrollLeft <= 8) {
        return 0;
      }
      return best;
    };

    const restoreSnap = () => {
      scroller.style.scrollSnapType = '';
      scroller.style.scrollBehavior = '';
      moving = false;
    };

    const goTo = (index) => {
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      active = clamped;
      const left = targetLeft(clamped);
      const goingBack = left < scroller.scrollLeft - 1;
      moving = true;
      scroller.style.scrollSnapType = 'none';
      scroller.style.scrollBehavior = goingBack ? 'auto' : 'smooth';
      scroller.scrollTo({ left, behavior: goingBack ? 'auto' : 'smooth' });
      if (goingBack && Math.abs(scroller.scrollLeft - left) > 1) {
        scroller.scrollLeft = left;
      }
      update();

      const finish = () => {
        scroller.removeEventListener('scrollend', finish);
        window.clearTimeout(restoreTimer);
        if (Math.abs(scroller.scrollLeft - left) > 4) {
          scroller.scrollLeft = left;
        }
        restoreSnap();
      };

      scroller.addEventListener('scrollend', finish, { once: true });
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(finish, 450);
    };

    items.forEach((item, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'sequence-dot';
      dot.setAttribute('aria-label', `Show screen ${index + 1} of ${items.length}`);
      dotsWrap.appendChild(dot);
      dot.addEventListener('click', () => goTo(index));
    });

    const update = () => {
      Array.from(dotsWrap.children).forEach((dot, dotIndex) => {
        const isActive = dotIndex === active;
        dot.classList.toggle('is-active', isActive);
        if (isActive) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
      prev.disabled = active === 0;
      next.disabled = active === items.length - 1;
    };

    prev.addEventListener('click', (event) => {
      event.preventDefault();
      goTo(active - 1);
    });
    next.addEventListener('click', (event) => {
      event.preventDefault();
      goTo(active + 1);
    });
    scroller.addEventListener('scroll', () => {
      if (moving) {
        return;
      }
      active = currentIndex();
      update();
    }, { passive: true });
    window.addEventListener('resize', () => {
      active = currentIndex();
      update();
    });
    update();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-white a, .nav-black a').forEach((link) => {
    const label = link.textContent.replace(/\s+/g, ' ').trim();
    const text = link.querySelector('p');
    if (text) {
      text.setAttribute('data-label', label);
    }
    link.addEventListener('click', () => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#') || href.includes('#')) {
        document.querySelectorAll('.site-nav.is-open').forEach((nav) => {
          setNavOpen(nav, false);
        });
      }
    });
  });
  if (sessionStorage.getItem('project-hero-enter')) {
    sessionStorage.removeItem('project-hero-enter');
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.classList.add('hero-enter');
    }
  }

  const initSectionReveal = () => {
    if (document.body.classList.contains('page-index')) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const targets = [
      ...document.querySelectorAll('section.wrap-up'),
      ...document.querySelectorAll('main > .content-img-wrap'),
    ];

    if (!targets.length) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.01,
      rootMargin: '80px 0px 0px 0px',
    });

    targets.forEach((target) => {
      target.classList.add('reveal');
      observer.observe(target);
    });
  };

  const initNavContrast = () => {
    const header = document.querySelector('.wrap-up-nav')
      || document.querySelector('.wrap-up-nav-hero .nav-items');
    if (!header) {
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 1;
    canvas.height = 1;

    const toLinear = (channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };

    const luminance = (r, g, b) => (
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    );

    const parseRgb = (value) => {
      const match = value && value.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return null;
      }
      const parts = match[1].split(',').map((part) => parseFloat(part.trim()));
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: Number.isFinite(parts[3]) ? parts[3] : 1,
      };
    };

    const imageLuminance = (img, x, y) => {
      if (!img.complete || !img.naturalWidth) {
        return null;
      }
      try {
        const rect = img.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
          return null;
        }
        const sx = ((x - rect.left) / rect.width) * img.naturalWidth;
        const sy = ((y - rect.top) / rect.height) * img.naturalHeight;
        ctx.clearRect(0, 0, 1, 1);
        ctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        return luminance(pixel[0], pixel[1], pixel[2]);
      } catch (error) {
        return null;
      }
    };

    const luminanceAt = (x, y) => {
      const stack = document.elementsFromPoint(x, y);
      for (const el of stack) {
        if (el === header || header.contains(el)) {
          continue;
        }
        if (el.id === 'back-to-up' || el.classList.contains('work-item-bg')) {
          continue;
        }
        if (el.tagName === 'IMG') {
          const fromImage = imageLuminance(el, x, y);
          if (fromImage != null) {
            return fromImage;
          }
        }
        if (el.classList.contains('hero') || el.classList.contains('work-list')) {
          return 0.14;
        }
        const color = parseRgb(getComputedStyle(el).backgroundColor);
        if (color && color.a >= 0.65) {
          return luminance(color.r, color.g, color.b);
        }
      }
      const bodyColor = parseRgb(getComputedStyle(document.body).backgroundColor);
      if (bodyColor) {
        return luminance(bodyColor.r, bodyColor.g, bodyColor.b);
      }
      return document.body.classList.contains('page-dark') ? 0.07 : 0.96;
    };

    let ticking = false;
    let isLight = header.classList.contains('is-light');

    const update = () => {
      ticking = false;
      if (document.body.classList.contains('nav-open')) {
        return;
      }

      const rect = header.getBoundingClientRect();
      const y = Math.max(8, rect.top + rect.height * 0.55);
      const xs = [0.18, 0.5, 0.82].map((part) => rect.left + rect.width * part);
      let total = 0;
      let count = 0;

      xs.forEach((x) => {
        const sample = luminanceAt(x, y);
        if (Number.isFinite(sample)) {
          total += sample;
          count += 1;
        }
      });

      if (!count) {
        return;
      }

      const average = total / count;
      const nextLight = isLight ? average > 0.36 : average > 0.5;
      if (nextLight === isLight) {
        return;
      }

      isLight = nextLight;
      header.classList.toggle('is-light', isLight);
    };

    const requestUpdate = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('load', requestUpdate);
    requestUpdate();
  };

  initAboutManifest();
  initNamePronunciation();
  initSequenceCarousels();
  initSectionReveal();
  initNavContrast();
  placeBackToTop();
  window.addEventListener('resize', placeBackToTop);
  document.querySelectorAll('.site-nav').forEach((nav) => {
    const toggle = nav.querySelector('.nav-toggle');
    if (!toggle) {
      return;
    }

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      setNavOpen(nav, !nav.classList.contains('is-open'));
    });

    nav.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.site-nav.is-open').forEach((nav) => {
      setNavOpen(nav, false);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.site-nav.is-open').forEach((nav) => {
        setNavOpen(nav, false);
      });
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
      document.querySelectorAll('.site-nav.is-open').forEach((nav) => {
        setNavOpen(nav, false);
      });
    }
  });

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const sizePreview = (bg, image) => {
    if (bg.closest('.preview-debitsuccess, .preview-youtube, .preview-wordle, .preview-digitalguru')) {
      const height = Math.min(620, window.innerHeight * 0.72);
      const width = height * (430 / 620);
      bg.style.width = `${Math.round(width)}px`;
      bg.style.height = `${Math.round(height)}px`;
      return;
    }

    const isLargePreview = bg.closest('.preview-blunt, .preview-insights');
    const maxW = Math.min(isLargePreview ? 920 : 760, window.innerWidth * (isLargePreview ? 0.74 : 0.62));
    const maxH = Math.min(isLargePreview ? 680 : 560, window.innerHeight * (isLargePreview ? 0.78 : 0.66));
    const ratio = image.naturalWidth / image.naturalHeight;
    let width;
    let height;

    if (ratio > maxW / maxH) {
      width = maxW;
      height = maxW / ratio;
    } else {
      height = maxH;
      width = maxH * ratio;
    }

    bg.style.width = `${Math.round(width)}px`;
    bg.style.height = `${Math.round(height)}px`;
  };

  const previewSrc = (item) => {
    const value = getComputedStyle(item).getPropertyValue('--preview').trim();
    return value.replace(/^url\(\s*['"]?(.+?)['"]?\s*\)$/, '$1');
  };

  const expandPreviewToHero = (bg, href) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = href;
      return;
    }

    const rect = bg.getBoundingClientRect();
    const startWidth = Math.max(rect.width, 280);
    const startHeight = Math.max(rect.height, 180);
    const startLeft = rect.width > 8 ? rect.left : (window.innerWidth - startWidth) / 2;
    const startTop = rect.height > 8 ? rect.top : (window.innerHeight - startHeight) / 2;

    document.body.classList.add('is-leaving');
    bg.classList.add('is-expanding');
    bg.style.transition = 'none';
    bg.style.left = '0px';
    bg.style.top = '0px';
    bg.style.width = `${startWidth}px`;
    bg.style.height = `${startHeight}px`;
    bg.style.transform = `translate(${startLeft}px, ${startTop}px)`;
    bg.style.opacity = '1';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ease = '0.7s cubic-bezier(0.22, 1, 0.36, 1)';
        bg.style.transition = `transform ${ease}, width ${ease}, height ${ease}`;
        bg.style.width = `${window.innerWidth}px`;
        bg.style.height = `${window.innerHeight * 0.6}px`;
        bg.style.transform = 'translate(0, 0)';
      });
    });

    sessionStorage.setItem('project-hero-enter', '1');
    window.setTimeout(() => {
      window.location.href = href;
    }, 720);
  };

  document.querySelectorAll('.work-item').forEach((item) => {
    const bg = item.querySelector('.work-item-bg');

    item.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      document.querySelectorAll('.work-item').forEach((other) => {
        other.classList.remove('is-opening');
      });
      item.classList.add('is-opening');

      if (bg) {
        expandPreviewToHero(bg, item.href);
      } else {
        window.location.href = item.href;
      }
    });

    if (!canHover || !bg) {
      return;
    }

    const src = previewSrc(item);
    if (src) {
      const image = new Image();
      image.onload = () => sizePreview(bg, image);
      image.src = src;
    }

    const placeBg = (event) => {
      bg.style.left = `${event.clientX}px`;
      bg.style.top = `${event.clientY}px`;
    };

    item.addEventListener('mouseenter', placeBg);
    item.addEventListener('mousemove', placeBg);
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      document.body.classList.remove('is-leaving');
      document.querySelectorAll('.work-item.is-opening').forEach((item) => {
        item.classList.remove('is-opening');
      });
      document.querySelectorAll('.work-item-bg.is-expanding').forEach((bg) => {
        bg.classList.remove('is-expanding');
        bg.style.transition = '';
        bg.style.left = '';
        bg.style.top = '';
        bg.style.width = '';
        bg.style.height = '';
        bg.style.transform = '';
      });
    }
  });
});