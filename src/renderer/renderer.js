import { getRadios, getRadiosFromAPI } from "./radioService.js";
//import Hls from "hls.js";

console.log("desktopAPI:", window.desktopAPI);

//====== Todos los getElement ========================================

const radioList = document.getElementById("radio-list");
const currentRadio = document.getElementById("current-radio");
const currentCountry = document.getElementById("current-country");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const statusText = document.getElementById("status");
const appName = document.getElementById("app-name");
const searchInput = document.getElementById("search-input");
const toggleFavsBtn = document.getElementById("toggle-favs");
const radioVisual = document.getElementById("radio-visual");
const openPlayListBtn = document.getElementById("open-playlist-btn");
const iptvStatus = document.getElementById("iptv-status");
const iptvCount = document.getElementById("iptv-count");
const iptvFileName = document.getElementById("iptv-file-name");
const iptvChannelList = document.getElementById("iptv-channel-list");
const currentType = document.getElementById("current-type");
const iptvVideo = document.getElementById("iptv-video");
const toggleIptvFavsBtn = document.getElementById("toggle-iptv-favs");
const prevIptvBtn = document.getElementById("prevIptv");
const nextIptvBtn = document.getElementById("nextIptv");
const LAST_IPTV_FILE_KEY = "antaresLastIptvFilePath";

//=========================== Estados Globales ========================================

let radios = [];
let iptvChannels = [];
let currentIptvIndex = -1;
let currentRadioIndex = -1;
let selectedRadio = null;
let audio = new Audio();
let searchTerm = "";
let favorites = [];
let showOnlyFavorites = false;
let selectedIptvChannel = null;
let expandedGroups = {};
let favoriteIptvChannels = [];
let showOnlyIptvFavorites = false;
let hlsPlayer = null;

//============================ Funciones ===========================================

function loadIptvPlayListFromResult(result) {
  if (!result) return false;

  const { filePath, content } = result;
  const channels = parseM3U(content);

  iptvChannels = channels;
  selectedIptvChannel = null;
  currentIptvIndex = -1;
  expandedGroups = {};

  renderIptvChannels();
  renderRadios();

  const fileName = filePath.split(/[\\/]/).pop();
  updateIptvStatus({
    status: "Lista Cargada",
    count: channels.length,
    fileName,
  });

  statusText.textContent = `Estado: lista IPTV cargada (${channels.length} canales)`;

  return true;
}

function playRadioByIndex(direction) {
  const visibleRadios = getVisibleRadios();

  if (visibleRadios.length === 0) return;

  //const currentRadio = visibleRadios[currentRadioIndex];

  let index = visibleRadios.findIndex((r) => r.id === selectedRadio?.id);

  if (index === -1) {
    index = 0;
  } else {
    index = (index + direction + visibleRadios.length) % visibleRadios.length;
  }

  currentRadioIndex = index;

  const radio = visibleRadios[currentRadioIndex];

  selectRadio(radio);
  playSelectedRadio();
}

function playIptvByDirection(direction) {
  const visibleChannels = getFilteredIptvChannels();

  if (visibleChannels.length === 0) return;

  let index = visibleChannels.findIndex(
    (c) => c.id === selectedIptvChannel?.id,
  );

  if (index === -1) {
    index = 0;
  } else {
    index =
      (index + direction + visibleChannels.length) % visibleChannels.length;
  }

  selectIptvChannel(visibleChannels[index]);
  playSelectedRadio();
}

function getVisibleRadios() {
  /* const searchTerm = searchInput.value.toLowerCase();

    return radios.filter(radio => {
        const matchesSearch =
            radio.name.toLowerCase().includes(searchTerm) ||
            radio.country.toLowerCase().includes(searchTerm);

        const matchesFavorite =
            !showOnlyFavorites || favorites.includes(radio.streamUrl);

            return matchesSearch && matchesFavorite;
    });*/

  return sortRadios(getFilteredRadios());
}

function resetIptvVideo() {
  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }

  if (iptvVideo) {
    iptvVideo.pause();
    iptvVideo.removeAttribute("src");
    iptvVideo.load();
  }
}

function getFilteredIptvChannels() {
  let result = [...iptvChannels];

  if (showOnlyIptvFavorites) {
    result = result.filter((channel) => isIptvFavorite(channel.id));
  }

  return result;
}

function loadIptvFavorites() {
  const savedIptvFavorites = localStorage.getItem("favoriteIptvChannels");

  if (savedIptvFavorites) {
    favoriteIptvChannels = JSON.parse(savedIptvFavorites);
  }
}

function saveIptvFavorites() {
  localStorage.setItem(
    "favoriteIptvChannels",
    JSON.stringify(favoriteIptvChannels),
  );
}

function isIptvFavorite(channelId) {
  return favoriteIptvChannels.includes(channelId);
}

function toggleIptvFavorite(channelId) {
  if (isIptvFavorite(channelId)) {
    favoriteIptvChannels = favoriteIptvChannels.filter(
      (id) => id !== channelId,
    );
  } else {
    favoriteIptvChannels.push(channelId);
  }

  saveIptvFavorites();
  renderIptvChannels();
}

function showRadioVisual() {
  if (radioVisual) radioVisual.classList.remove("hidden");
  if (iptvVideo) iptvVideo.classList.add("hidden");
}

function showIptvVideo() {
  if (radioVisual) radioVisual.classList.add("hidden");
  if (iptvVideo) iptvVideo.classList.remove("hidden");
}

const videoError = document.getElementById("video-error");
const videoErrorName = document.getElementById("video-error-name");

function showVideoError(channelName) {
  videoErrorName.textContent = channelName || "";
  videoError.classList.remove("hidden");
}

function hideVideoError() {
  videoError.classList.add("hidden");
}

function stopIptvVideo() {
  resetIptvVideo();
}

function toggleIptvGroup(groupName) {
  expandedGroups[groupName] = !expandedGroups[groupName];
  renderIptvChannels();
}

function updateIptvStatus({ status, count = 0, fileName = "Ninguno" }) {
  if (iptvStatus) iptvStatus.textContent = status;
  if (iptvCount) iptvCount.textContent = count;
  if (iptvFileName) iptvFileName.textContent = fileName;
}

function setRadioVisual(state) {
  if (state === "loading") {
    if (!radioVisual) return;

    radioVisual.src = "../../assets/gifs/radio-loading.gif";
  } else if (state === "playing") {
    radioVisual.src = "../../assets/gifs/radio-playing.gif";
  } else {
    radioVisual.src = "../../assets/gifs/radio-idle.gif";
  }
}

//appName.textContent =  `Aplicación: ${window.desktopAPI.appName}`;

if (window.desktopAPI && appName) {
  appName.textContent = `Aplicación: ${window.desktopAPI.appName}`;
} else {
  appName.textContent = `Aplicación: Antares`;
}

function parseM3U(content) {
  const lines = content.split("\n");

  const channels = [];
  let current = {};

  lines.forEach((line, index) => {
    line = line.trim();

    if (!line) return;

    if (line.startsWith("#EXTINF")) {
      const nameFromComma = line.split(",").pop()?.trim() || "Canal sin nombre";

      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);

      const group = groupMatch ? groupMatch[1].trim() : "Sin grupo";
      const logo = logoMatch ? logoMatch[1].trim() : "";
      const tvgName = tvgNameMatch ? tvgNameMatch[1].trim() : "";

      const name = tvgName || nameFromComma;

      current = {
        id: `iptv-${index}-${name}`,
        name,
        group,
        logo,
        country: "IPTV",
        streamUrl: "",
        source: "iptv",
      };
    } else if (!line.startsWith("#")) {
      current.streamUrl = line;

      if (current.name && current.streamUrl) {
        channels.push(current);
      }

      current = {};
    }
  });

  return channels;
}

function groupIptvchannels(channels) {
  const grouped = {};

  channels.forEach((channel) => {
    const groupName = channel.group || "Sin grupo";

    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }

    grouped[groupName].push(channel);
  });

  return grouped;
}

function loadFavorites() {
  const savedRadiosFavorites = localStorage.getItem("favoriteRadios");

  if (savedRadiosFavorites) {
    favorites = JSON.parse(savedRadiosFavorites);
  }
}

function saveFavorites() {
  localStorage.setItem("favoriteRadios", JSON.stringify(favorites));
}

function isFavorite(radioId) {
  return favorites.includes(radioId);
}

function toggleFavorite(radioId) {
  if (isFavorite(radioId)) {
    favorites = favorites.filter((id) => id !== radioId);
  } else {
    favorites.push(radioId);
  }

  saveFavorites();
  renderRadios();
}

function sortRadios(radioList) {
  return [...radioList].sort((a, b) => {
    const aFav = isFavorite(a.id) ? 1 : 0;
    const bFav = isFavorite(b.id) ? 1 : 0;

    return bFav - aFav;
  });
}

statusText.textContent = "Estado: cargando radios...";

updateIptvStatus({
  status: "Sin lista cargada",
  count: 0,
  fileName: "Ninguno",
});

//======= asincronía ==========

async function init() {
  const localRadios = getRadios();
  const onlineRadios = await getRadiosFromAPI();

  radios = [...localRadios, ...onlineRadios];

  renderRadios();
  statusText.textContent = "Estado: radios cargadas";
  setRadioVisual("idle");
}

async function playIptvChannel(channel) {
  if (!channel || !channel.streamUrl) {
    statusText.textContent = "Estado: canal IPTV inválido";
    return;
  }

  try {
    hideVideoError();
    resetIptvVideo();
    showIptvVideo();

    statusText.textContent = `Estado: cargando ${channel.name}...`;

    const url = channel.streamUrl;
    const Hls = window.Hls;

    if (Hls && Hls.isSupported() && url.includes(".m3u8")) {
      hlsPlayer = new Hls();
      hlsPlayer.loadSource(url);
      hlsPlayer.attachMedia(iptvVideo);

      await new Promise((resolve, reject) => {
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, resolve);
        hlsPlayer.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) reject(data);
        });
      });

      await iptvVideo.play();
    } else {
      iptvVideo.src = url;
      await iptvVideo.play();
    }

    statusText.textContent = `Estado: reproduciendo ${channel.name}`;
  } catch (error) {
    console.error("Error reproduciendo IPTV:", error);
    statusText.textContent = "Estado: no se pudo reproducir este canal IPTV";

    if (document.fullscreenElement) {
      // En fullscreen: mantener al usuario ahí, avisarle y darle los controles
      showVideoError(channel.name);
      showFloatingControls();
    } else {
      // Modo normal: comportamiento de siempre
      resetIptvVideo();
      showRadioVisual();
    }
  }
}
async function loadLastIptvPlaylist() {
  const savedFilePath = localStorage.getItem(LAST_IPTV_FILE_KEY);

  if (!savedFilePath) return;

  try {
    updateIptvStatus({
      status: "Cargando última lista...",
      count: 0,
      fileName: savedFilePath.split(/[\\/]/).pop(),
    });

    const result = await window.iptvAPI.readFile(savedFilePath);

    if (!result) {
      localStorage.removeItem(LAST_IPTV_FILE_KEY);

      updateIptvStatus({
        status: "Lista anterior no encontrada",
        count: 0,
        fileName: "Ninguno",
      });

      statusText.textContent = "Estado: la lista anterior fue movida o borrada";
      return;
    }

    loadIptvPlayListFromResult(result);
  } catch (error) {
    console.error("Error cargando última lista IPTV:", error);

    updateIptvStatus({
      status: "Error al cargar última lista",
      count: 0,
      fileName: "Ninguno",
    });
  }
}

function getFilteredRadios() {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  let result = [...radios];

  if (normalizedSearch) {
    result = result.filter((radio) => {
      const nameMatch = radio.name.toLowerCase().includes(normalizedSearch);
      const countryMatch = radio.country
        .toLowerCase()
        .includes(normalizedSearch);

      return nameMatch || countryMatch;
    });
  }

  if (showOnlyFavorites) {
    result = result.filter((radio) => isFavorite(radio.id));
  }

  return result;
}

function renderRadios() {
  radioList.innerHTML = "";

  const filteredRadios = getFilteredRadios();
  const sorteredRadios = sortRadios(filteredRadios);

  sorteredRadios.forEach((radio) => {
    const item = document.createElement("div");
    item.className = "radio-item";
    item.dataset.id = radio.id;

    item.innerHTML = `
        <div class="radio-header">
            <div class="radio-name">${radio.name}</div>
            <button class="favorite-btn" data-id="${radio.id}">${isFavorite(radio.id) ? "★" : "☆"}</button>

        </div>
            <div class="radio-meta">${radio.country}</div>
        `;

    const favoriteBtn = item.querySelector(".favorite-btn");

    favoriteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(radio.id);
    });

    item.addEventListener("click", () => selectRadio(radio));

    if (selectedRadio && selectedRadio.id === radio.id) {
      item.classList.add("active");
    }

    radioList.appendChild(item);
  });

  if (filteredRadios.length === 0) {
    radioList.innerHTML =
      '<p class="empty-message">No se encontraron radios.</p>';
    return;
  }
}

function selectRadio(radio) {
  selectedRadio = radio;
  selectedIptvChannel = null;

  const visibleRadios = getVisibleRadios();

  currentRadioIndex = visibleRadios.findIndex((r) => r.id === radio.id);

  stopIptvVideo();
  showRadioVisual();

  currentRadio.textContent = radio.name;
  currentCountry.textContent = radio.country;
  currentType.textContent = "Radio";
  statusText.textContent = "Estado: radio seleccionada";

  setRadioVisual("idle");
  renderRadios();
  renderIptvChannels();
}

async function playSelectedRadio() {
  const source = selectedIptvChannel || selectedRadio;

  if (!source) {
    statusText.textContent = "Estado: selecciona una fuente primero";
    setRadioVisual("idle");
    return;
  }

  try {
    statusText.textContent = `Estado: cargando ${source.name}...`;
    setRadioVisual("loading");

    if (selectedIptvChannel) {
      audio.pause();

      await playIptvChannel(selectedIptvChannel);
      return;
    }

    stopIptvVideo();
    showRadioVisual();

    if (!audio.src || !audio.src.includes(source.streamUrl)) {
      audio.pause();
      audio = new Audio(source.streamUrl);
    }

    await audio.play();

    statusText.textContent = `Estado: reproduciendo ${source.name}`;

    setRadioVisual("playing");
  } catch (error) {
    console.error("Error al reproducir el stream:", error);

    if (selectedIptvChannel) {
      statusText.textContent =
        "Estado: este canal IPTV requiere reproductor de video";
    } else {
      statusText.textContent = "Estado: error al reproducir radio";
    }

    setRadioVisual("idle");
    showRadioVisual();
  }
}

function pauseRadio() {
  if (selectedIptvChannel && iptvVideo) {
    iptvVideo.pause();
  } else {
    audio.pause();
  }

  statusText.textContent = "Estado: pausado";
  setRadioVisual("idle");
}

function stopRadio() {
  if (selectedIptvChannel && iptvVideo) {
    iptvVideo.pause();
    iptvVideo.currentTime = 0;
  } else {
    audio.pause();
    audio.currentTime = 0;
  }

  statusText.textContent = "Estado: detenido";
  setRadioVisual("idle");
}

function renderIptvChannels() {
  if (!iptvChannelList) return;

  iptvChannelList.innerHTML = "";

  if (iptvChannels.length === 0) {
    iptvChannelList.innerHTML =
      '<p class="iptv-empty-message">Carga una lista IPTV para ver canales aquí.</p>';
    return;
  }

  const filteredIptvChannels = getFilteredIptvChannels();

  if (filteredIptvChannels.length === 0) {
    iptvChannelList.innerHTML =
      '<p class = "iptv-empty-message">No tienes canales IPTV favoritos.</p>';
    return;
  }

  const groupedChannels = groupIptvchannels(filteredIptvChannels);

  Object.entries(groupedChannels).forEach(([groupName, channels]) => {
    const groupSection = document.createElement("div");
    groupSection.className = "iptv-group-section";

    const groupTitle = document.createElement("button");
    groupTitle.className = "iptv-group-title";
    groupTitle.innerHTML = `
                    <span>${groupName}</span>
                    <span class="iptv-group-arrow">${expandedGroups[groupName] ? "▾" : "▸"}</span>`;

    groupTitle.addEventListener("click", () => {
      toggleIptvGroup(groupName);
    });

    groupSection.appendChild(groupTitle);

    if (expandedGroups[groupName]) {
      const groupList = document.createElement("div");
      groupList.className = "iptv-group-list";

      channels.forEach((channel) => {
        const item = document.createElement("div");
        item.className = "iptv-channel-card";

        if (selectedIptvChannel && selectedIptvChannel.id === channel.id) {
          item.classList.add("active");
        }

        item.innerHTML = `
                            <div class = "iptv-channel-header">
                                <div class="iptv-channel-name">${channel.name}</div>
                                <button class = "iptv-favorite-btn" data-id="${channel.id}">
                                ${isIptvFavorite(channel.id) ? "★" : "☆"}
                                </button>
                            </div>
                            <div class="iptv-channel-meta">Fuente: IPTV</div>
                        `;

        const favBtn = item.querySelector(".iptv-favorite-btn");

        favBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleIptvFavorite(channel.id);
        });

        item.addEventListener("click", () => {
          selectIptvChannel(channel);
        });

        groupList.appendChild(item);
      });

      groupSection.appendChild(groupList);
    }

    iptvChannelList.appendChild(groupSection);
  });
}

function selectIptvChannel(channel) {
  selectedIptvChannel = channel;
  selectedRadio = null;

  currentIptvIndex = iptvChannels.findIndex(
    (c) => c.streamUrl === channel.streamUrl,
  );

  showIptvVideo();

  currentRadio.textContent = channel.name;
  currentCountry.textContent = "IPTV";
  currentType.textContent = "IPTV";
  statusText.textContent = "Estado: canal IPTV seleccionado";

  setRadioVisual("idle");
  renderIptvChannels();
  renderRadios();
}

playBtn.addEventListener("click", playSelectedRadio);
pauseBtn.addEventListener("click", pauseRadio);
stopBtn.addEventListener("click", stopRadio);
searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trimStart();
  renderRadios();
});

prevIptvBtn.addEventListener("click", () => {
  if (currentType.textContent === "IPTV") {
    playIptvByDirection(-1);
  } else {
    playRadioByIndex(-1);
  }
});

nextIptvBtn.addEventListener("click", () => {
  if (currentType.textContent === "IPTV") {
    playIptvByDirection(+1);
  } else {
    playRadioByIndex(+1);
  }
});

toggleFavsBtn.addEventListener("click", () => {
  showOnlyFavorites = !showOnlyFavorites;
  toggleFavsBtn.classList.toggle("active");
  renderRadios();
});

audio.addEventListener("playing", () => {
  setRadioVisual("playing");
});

audio.addEventListener("waiting", () => {
  setRadioVisual("loading");
});

audio.addEventListener("pause", () => {
  setRadioVisual("idle");
});

//========================== Carga =========================

loadFavorites();
loadIptvFavorites();
init();
renderIptvChannels();
loadLastIptvPlaylist();

//==========================================================

toggleIptvFavsBtn.addEventListener("click", () => {
  showOnlyIptvFavorites = !showOnlyIptvFavorites;
  toggleIptvFavsBtn.classList.toggle("active");
  renderIptvChannels();
});

openPlayListBtn.addEventListener("click", async () => {
  try {
    updateIptvStatus({
      status: "Abriendo selector...",
      count: iptvChannels.length,
      fileName: iptvChannels.length > 0 ? iptvFileName.textContent : "Ninguno",
    });

    const result = await window.iptvAPI.openFile();

    if (!result) {
      updateIptvStatus({
        status: "Selección cancelada",
        count: iptvChannels.length,
        fileName:
          iptvChannels.length > 0 ? iptvFileName.textContent : "Ninguno",
      });

      statusText.textContent = "Estado: selección cancelada";
      return;
    }

    const loaded = loadIptvPlayListFromResult(result);

    if (loaded) {
      localStorage.setItem(LAST_IPTV_FILE_KEY, result.filePath);
      console.log("Lista IPTV guardada", result.filePath);
    }
  } catch (error) {
    console.error("Error al abrir o parsear la lista IPTV:", error);

    updateIptvStatus({
      status: "Error al cargar lista",
      count: 0,
      fileName: "Ninguno",
    });

    statusText.textContent = "Estado: error al cargar la lista IPTV";
  }
});

//============ Controles flotantes fullscreen ============

const videoWrapper = document.querySelector(".video-wrapper");
const floatingControls = document.getElementById("floating-controls");
let hideControlsTimer = null;

function showFloatingControls() {
  floatingControls.classList.add("visible");
  clearTimeout(hideControlsTimer);
  hideControlsTimer = setTimeout(() => {
    floatingControls.classList.remove("visible");
  }, 3000); // se ocultan después de 3 segundos sin mover el mouse
}

// Solo activar controles flotantes en fullscreen
videoWrapper.addEventListener("mousemove", () => {
  if (
    !iptvVideo.classList.contains("hidden") ||
    !videoError.classList.contains("hidden")
  ) {
    showFloatingControls();
  }
});

// Cuando entra a fullscreen: ocultar cursor al estar quieto
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    // Salió del fullscreen: limpiar
    floatingControls.classList.remove("visible");
    clearTimeout(hideControlsTimer);
    hideVideoError();
  }
});

// Conectar los botones flotantes a las mismas funciones existentes
document.getElementById("fc-play").addEventListener("click", playSelectedRadio);
document.getElementById("fc-pause").addEventListener("click", pauseRadio);
document.getElementById("fc-stop").addEventListener("click", stopRadio);

document.getElementById("fc-prev").addEventListener("click", () => {
  prevIptvBtn.click();
});

document.getElementById("fc-next").addEventListener("click", () => {
  nextIptvBtn.click();
});

const fullscreenBtn = document.getElementById("fc-fullscreen");

fullscreenBtn.addEventListener("click", async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await videoWrapper.requestFullscreen();
  }
});
