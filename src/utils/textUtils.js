/**
 * Utilidades para manejo, conversión y limpieza de texto enriquecido (HTML y Markdown)
 */

/**
 * Normaliza una URL asegurando que tenga protocolo seguro https:// y evitando esquemas maliciosos
 */
export const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  
  // Evitar esquemas javascript: o data: maliciosos
  if (/^(javascript:|data:text\/html)/i.test(trimmed)) {
    return '#';
  }

  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

/**
 * Convierte código HTML (por ejemplo, pegado desde Word, Google Docs, Canvas, Teams o páginas web)
 * a formato Markdown limpio preservando enlaces, negritas, cursivas, listas y saltos de línea.
 */
export const htmlToMarkdown = (html) => {
  if (!html || typeof html !== 'string') return '';

  // Si no contiene etiquetas HTML, retornar el texto tal cual
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      let childrenText = Array.from(node.childNodes).map(processNode).join('');

      switch (tag) {
        case 'h1':
          return `\n# ${childrenText.trim()}\n\n`;
        case 'h2':
          return `\n## ${childrenText.trim()}\n\n`;
        case 'h3':
          return `\n### ${childrenText.trim()}\n\n`;
        case 'h4':
        case 'h5':
        case 'h6':
          return `\n#### ${childrenText.trim()}\n\n`;
        case 'strong':
        case 'b':
          return childrenText.trim() ? `**${childrenText.trim()}**` : '';
        case 'em':
        case 'i':
          return childrenText.trim() ? `*${childrenText.trim()}*` : '';
        case 'u':
          return childrenText.trim() ? `<u>${childrenText.trim()}</u>` : '';
        case 's':
        case 'strike':
        case 'del':
          return childrenText.trim() ? `~~${childrenText.trim()}~~` : '';
        case 'code':
          return `\`${childrenText}\``;
        case 'pre':
          return `\n\`\`\`\n${childrenText}\n\`\`\`\n`;
        case 'blockquote':
          return `\n> ${childrenText.trim().replace(/\n/g, '\n> ')}\n\n`;
        case 'a': {
          const href = node.getAttribute('href') || '';
          const text = childrenText.trim() || href;
          if (!href || href.startsWith('javascript:')) return text;
          return `[${text}](${href})`;
        }
        case 'ul':
          return `\n${childrenText}\n`;
        case 'ol':
          return `\n${childrenText}\n`;
        case 'li': {
          const parent = node.parentElement;
          if (parent && parent.tagName.toLowerCase() === 'ol') {
            const index = Array.from(parent.children).indexOf(node) + 1;
            return `${index}. ${childrenText.trim()}\n`;
          }
          return `- ${childrenText.trim()}\n`;
        }
        case 'p':
        case 'div':
          return `${childrenText.trim()}\n\n`;
        case 'br':
          return '\n';
        case 'hr':
          return '\n---\n';
        default:
          return childrenText;
      }
    };

    let result = Array.from(doc.body.childNodes).map(processNode).join('');
    // Normalizar saltos de línea repetidos
    result = result.replace(/\n{3,}/g, '\n\n').trim();
    return result;
  } catch (err) {
    console.warn('Error al convertir HTML a Markdown:', err);
    return html;
  }
};

/**
 * Limpia el texto de sintaxis markdown y etiquetas HTML para previsualizaciones compactas
 */
export const stripMarkdownAndHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    // Decodificar entidades HTML comunes
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Remover etiquetas HTML
    .replace(/<[^>]*>/g, '')
    // Convertir enlaces [texto](url) a texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remover encabezados
    .replace(/^#{1,6}\s+/gm, '')
    // Remover negrita y cursiva
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remover tachado
    .replace(/~~(.*?)~~/g, '$1')
    // Remover bloques de código y código inline
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remover viñetas de lista
    .replace(/^(\s*[-*+•]|\s*\d+\.)\s+/gm, '')
    // Remover blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Reemplazar saltos de línea por espacios
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Detecta y procesa enlaces de acción directa en actividades escolares
 * (Foros, Exámenes, Reuniones Síncronas en Teams, WhatsApp, Google Meet, Zoom, etc.)
 */
export const getDirectActionInfo = (activity) => {
  if (!activity) return null;

  // Buscar URL en directUrl o en campos alternativos
  const rawUrl = (
    activity.directUrl || 
    activity.meetingUrl || 
    activity.examUrl || 
    activity.forumUrl || 
    activity.actionUrl || 
    ''
  ).trim();

  if (!rawUrl) return null;

  const formattedUrl = normalizeUrl(rawUrl);
  const type = activity.type || '';
  const lowerUrl = formattedUrl.toLowerCase();

  // 1. REUNIONES SÍNCRONAS Y ENLACES DE VIDEOLLAMADA / MENSAJERÍA
  if (
    type === 'reunion_sincrona' || 
    lowerUrl.includes('teams.microsoft.com') || 
    lowerUrl.includes('teams.live.com') || 
    lowerUrl.includes('meet.google.com') || 
    lowerUrl.includes('chat.whatsapp.com') || 
    lowerUrl.includes('wa.me') || 
    lowerUrl.includes('whatsapp.com') || 
    lowerUrl.includes('zoom.us')
  ) {
    if (lowerUrl.includes('teams.microsoft.com') || lowerUrl.includes('teams.live.com')) {
      return {
        url: formattedUrl,
        platform: 'teams',
        label: 'Unirse en Teams',
        shortLabel: 'Teams',
        actionType: 'meeting',
        colorClass: 'bg-[#464EB8] hover:bg-[#3b429f] text-white shadow-[#464EB8]/25',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
      };
    }

    if (lowerUrl.includes('chat.whatsapp.com') || lowerUrl.includes('wa.me') || lowerUrl.includes('whatsapp.com')) {
      return {
        url: formattedUrl,
        platform: 'whatsapp',
        label: 'Abrir en WhatsApp',
        shortLabel: 'WhatsApp',
        actionType: 'meeting',
        colorClass: 'bg-[#128C7E] hover:bg-[#075E54] text-white shadow-[#128C7E]/25',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
      };
    }

    if (lowerUrl.includes('meet.google.com')) {
      return {
        url: formattedUrl,
        platform: 'meet',
        label: 'Unirse con Google Meet',
        shortLabel: 'Google Meet',
        actionType: 'meeting',
        colorClass: 'bg-[#00897B] hover:bg-[#00796B] text-white shadow-[#00897B]/25',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200'
      };
    }

    if (lowerUrl.includes('zoom.us')) {
      return {
        url: formattedUrl,
        platform: 'zoom',
        label: 'Unirse en Zoom',
        shortLabel: 'Zoom',
        actionType: 'meeting',
        colorClass: 'bg-[#2D8CFF] hover:bg-[#1f7ae6] text-white shadow-[#2D8CFF]/25',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200'
      };
    }

    return {
      url: formattedUrl,
      platform: 'reunion',
      label: 'Entrar a la Reunión',
      shortLabel: 'Reunión',
      actionType: 'meeting',
      colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  }

  // 2. EXÁMENES Y EVALUACIONES
  if (type === 'examen') {
    return {
      url: formattedUrl,
      platform: 'examen',
      label: 'Ir al Examen',
      shortLabel: 'Examen',
      actionType: 'exam',
      colorClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200'
    };
  }

  // 3. FOROS DE DEBATE
  if (type === 'foro') {
    return {
      url: formattedUrl,
      platform: 'foro',
      label: 'Ir al Foro',
      shortLabel: 'Foro',
      actionType: 'forum',
      colorClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
    };
  }

  // 4. ACTIVIDAD FORMATIVA / OTRA ASIGNACIÓN
  return {
    url: formattedUrl,
    platform: 'actividad',
    label: 'Ir a la Actividad',
    shortLabel: 'Abrir',
    actionType: 'activity',
    colorClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  };
};

