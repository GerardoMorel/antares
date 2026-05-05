import { radios } from './radio.js';

export function getRadios(){
    // por ahora: datos locales.
    return radios;
}

// Radios Online desde Radio Browser 
export async function getRadiosFromAPI() {
    try {
        const response = await fetch(
            'https://de1.api.radio-browser.info/json/stations/topclick/2000'
   
        );

    const data = await response.json();

    return data
        .filter((station) => station.utl_resolved || station.url)
        .map((station, index) => ({
            id: `api-${station.stationuuid}`,
            name:station.name || 'Sin nombre',
            country: station.country || 'Desconicido',
            streamUrl: station.url_resolved || station.url
        }));
} catch (error) {
    console.error('Error obteniendo radios online', error);
    return [];
    }
}

