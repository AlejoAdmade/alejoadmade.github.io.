(() => {
    const PokemonApp = (() => {
        const cacheTiempo = 180000;
        const pokeApi = 'https://pokeapi.co/api/v2';
        const Historico = 'Historico';
        const maximoHistorial = 100;
        const Favoritos = 'Favoritos';

        let pokemon1 = null;
        let pokemon2 = null;

        const htmlElements = {
            app: document.getElementById("app"),
            audio: document.getElementById("sonido"),
            btnBuscar: document.getElementById("b"),
            btnTema: document.getElementById("tema"),
            inputQuery: document.getElementById("q"),
            selectModo: document.getElementById("modo"),
        };

        const state = {
            currentPokemon: null,
            currentAbility: null,
            currentView: 'search',
            history: [],
            currentOrigen: null,
        };

        const storage = {
            getHistory() {
                const data = window.localStorage?.getItem(Historico);
                return data ? JSON.parse(data) : [];
            },

            saveHistory(history) {
                try {
                    window.localStorage?.setItem(Historico, JSON.stringify(history));
                } catch (e) {
                    console.warn('No se pudo guardar el historial');
                }
            },

            addToHistory(pokemon) {
                let history = this.getHistory();
                history = history.filter(p => p.id !== pokemon.id);
                history.unshift({
                    id: pokemon.id,
                    name: pokemon.name,
                    sprite: pokemon.sprites.front_default || 
                           pokemon.sprites.other?.["official-artwork"]?.front_default,
                    types: pokemon.types.map(t => t.type.name),
                    timestamp: Date.now()
                });

                if (history.length > maximoHistorial) {
                    history = history.slice(0, maximoHistorial);
                }
                this.saveHistory(history);
                state.history = history;
            },

            removeFromHistory(pokemonId) {
                let history = this.getHistory();
                history = history.filter(p => p.id !== pokemonId);
                this.saveHistory(history);
                state.history = history;
            },

            clearHistory() {
                try {
                    window.localStorage?.removeItem(Historico);
                } catch (e) {
                    console.warn('No se pudo limpiar el historial');
                }
                state.history = [];
            },

            getFavoritos() {
                const data = window.localStorage?.getItem(Favoritos);
                return data ? JSON.parse(data) : [];
            },

            guardarFavoritos(favoritos) {
                try {
                    window.localStorage?.setItem(Favoritos, JSON.stringify(favoritos));
                } catch (e) {
                    console.warn('No se pudieron guardar los favoritos');
                }
            },

            alternarFavorito(pokemon) {
                let favoritos = this.getFavoritos();
                const existe = favoritos.find(p => p.id === pokemon.id);

                if (existe) {
                    favoritos = favoritos.filter(p => p.id !== pokemon.id);
                } else {
                    favoritos.unshift({
                        id: pokemon.id,
                        name: pokemon.name,
                        sprite: pokemon.sprite ||
                                pokemon.sprites?.front_default ||
                               pokemon.sprites?.other?.["official-artwork"]?.front_default,
                        types: pokemon.types[0]?.type 
                              ? pokemon.types.map(t => t.type.name)  
                              : pokemon.types,
                        timestamp: Date.now()
                    });
                }

                this.guardarFavoritos(favoritos);
                return favoritos;
            },

            esFavorito(id) {
                return this.getFavoritos().some(p => p.id === id);
            }
        };

        const cache = {
        key(k) {
            return `PKF_CACHE_${k}`; // ✅ prefijo fijo (no choca con nada)
        },

        get(k) {
            try {
            // ✅ lee primero la key nueva
            const raw = window.localStorage?.getItem(this.key(k));
            if (raw) {
                const parsed = JSON.parse(raw);

                // formato nuevo esperado: { t, data }
                if (parsed && typeof parsed === "object" && "t" in parsed && "data" in parsed) {
                if (Date.now() - parsed.t > cacheTiempo) return null;
                return parsed.data;
                }

                // por si quedara algo raro
                return null;
            }

            // ✅ fallback: intenta leer la key vieja (tu versión anterior guardaba directo por nombre)
            const legacyRaw = window.localStorage?.getItem(k);
            if (!legacyRaw) return null;

            const legacyParsed = JSON.parse(legacyRaw);

            // si era formato {t,data}
            if (legacyParsed && typeof legacyParsed === "object" && "t" in legacyParsed && "data" in legacyParsed) {
                if (Date.now() - legacyParsed.t > cacheTiempo) return null;
                return legacyParsed.data;
            }

            // si era el objeto pokemon directo (sin wrapper)
            if (legacyParsed && typeof legacyParsed === "object" && legacyParsed.id) {
                return legacyParsed;
            }

            return null;
            } catch (e) {
            return null;
            }
        },

        set(k, data) {
            try {
            window.localStorage?.setItem(
                this.key(k),
                JSON.stringify({ t: Date.now(), data })
            );
            } catch (e) {
            console.warn("No se pudo guardar en caché");
            }
        }
        };


        const templates = {
            pokemon(p, origen) {
                const esFav = storage.esFavorito(p.id);
                const habilidades = p.abilities.map(a => `
                    <span class="${a.is_hidden ? "habilidad-oculta" : ""}">
                        ${a.ability.name}${a.is_hidden ? " (Oculta)" : ""}
                    </span>
                `).join("");

                const tipos = p.types.map(t => 
                    `<div>${t.type.name}</div>`
                ).join("");

                const stats = p.stats.map(s => {
                    const porcentaje = Math.min((s.base_stat / 255) * 100, 100);
                    return `
                        <div class="stat">
                            <div>${s.stat.name}</div>
                            <div class="barra">
                                <div class="relleno" style="width:${porcentaje}%"></div>
                            </div>
                        </div>
                    `;
                }).join("");

                const img = p.sprites.front_default ||
                           p.sprites.other?.["official-artwork"]?.front_default ||
                           "";

                return `
                    <div class="card">
                        <div class="badge-data">POKEMON_DATA</div>
                        <div class="badge-origen">${origen.toUpperCase()}</div>

                        <div class="sprite-box">
                            <img src="${img}">
                        </div>

                        <div class="titulo">#${p.id} ${p.name.toUpperCase()}</div>
                        <div class="linea"></div>

                        <div class="tipos">${tipos}</div>
                        <h3 style="text-align:left; margin:10px 0 6px 0;">HABILIDADES</h3>
                        <div class="habilidades">${habilidades}</div>
                        ${stats}

                        <div class="fav-btn">
                            <button onclick="PokemonApp.toggleFavorito()">
                                ${esFav ? "❤️" : "🤍"}
                            </button>
                        </div>

                        <div class="separador"></div>
                        <b>CADENA DE EVOLUCIÓN</b>

                        <div class="evo-root" id="evo-root"></div>
                        <div class="evos-grid" id="evos"></div>
                    </div>
                `;
            },

            ability(ability, effectText, lista) {
                return `
                    <div class="card-ability">
                        <div class="ability-header">
                            <h1 class="ability-title">${ability.name.toUpperCase()}</h1>
                            <div class="ability-id">#${ability.id}</div>
                        </div>

                        <div class="ability-section">
                            <h3>Effect</h3>
                            <div class="ability-effect-box">${effectText}</div>
                        </div>

                        <div class="ability-section">
                            <h3>Pokémon with this ability (${ability.pokemon.length})</h3>
                            <div class="ability-list-box">
                                ${lista}
                            </div>
                        </div>
                    </div>
                `;
            },

            abilityPokemonItem(name, img, isHidden) {
                return `
                    <div class="hab-item" onclick="PokemonApp.buscarPokemonDesdeHabilidad('${name}')">
                        <img src="${img}">
                        <div class="hab-name">
                            ${name.toUpperCase()} 
                            ${isHidden ? "<span class='hidden-tag'>(oculta)</span>" : ""}
                        </div>
                    </div>
                `;
            },

            evolutionRoot(base, img) {
                return `
                    <div class="evo-root-box" onclick="PokemonApp.buscarDirecto('${base}')">
                        <img src="${img}">
                        <div>${base}</div>
                    </div>
                `;
            },

            evolutionArrow() {
                return `<div class="flecha">➜</div>`;
            },

            evolutionItem(name, img) {
                return `
                    <div class="evo" onclick="PokemonApp.buscarDirecto('${name}')">
                        <img src="${img}">
                        <div>${name}</div>
                    </div>
                `;
            },

            historyView(history) {
                if (history.length === 0) {
                return `
                    <div class="history-container">
                    <div class="card">
                        <h2>📜 Historial vacío</h2>
                        <p>No has buscado ningún Pokémon todavía</p>
                        <p style="opacity:0.7;">Usa la pestaña 🔍 Buscar para comenzar</p>
                    </div>
                    </div>
                `;
                }


                const historyItems = history.map(p => this.historyItem(p)).join('');

                return `
                    <div class="history-container">
                        <div class="history-grid">
                        ${historyItems}
                        </div>

                        <button class="history-clear-all history-clear-bottom"
                        onclick="PokemonApp.clearHistory()">
                        🗑️ LIMPIAR TODO
                        </button>
                    </div>
                    `;

            },

            historyItem(pokemon) {
                const esFav = storage.esFavorito(pokemon.id);
                const tipos = pokemon.types.map(t => 
                    `<span class="history-type">${t}</span>`
                ).join('');

                return `
                    <div class="history-item">
                        <button class="history-delete" 
                                onclick="event.stopPropagation(); PokemonApp.removeFromHistory(${pokemon.id})">
                            ✕
                        </button>

                        <button 
                            class="history-fav"
                            onclick="event.stopPropagation(); PokemonApp.toggleFavoritoDesdeHistorial(${pokemon.id})">
                            ${esFav ? "❤️" : "🤍"}
                        </button>

                        <div class="history-content" onclick="PokemonApp.buscarDirecto('${pokemon.name}')">
                            <img src="${pokemon.sprite}" alt="${pokemon.name}">
                            <div class="history-info">
                                <div class="history-name">
                                    #${pokemon.id} ${pokemon.name.toUpperCase()}
                                </div>
                                <div class="history-types">${tipos}</div>
                            </div>
                        </div>
                    </div>
                `;
            },

            favoritesView(favoritos) {
                if (favoritos.length === 0) {
                return `
                    <div class="history-container">
                    <div class="card">
                        <h2>❤️ Favoritos vacío</h2>
                        <p>No has agregado ningún Pokémon todavía</p>
                        <p style="opacity:0.7;">Usa el botón ❤️ para agregar</p>
                    </div>
                    </div>
                `;
                }


                const items = favoritos.map(p => this.favoriteItem(p)).join('');

                return `
                    <div class="history-container">
                        <h2>❤️ Favoritos</h2>
                        <div class="history-grid">
                            ${items}
                        </div>
                    </div>
                `;
            },

            favoriteItem(pokemon) {
                const tipos = pokemon.types.map(t =>
                    `<span class="history-type">${t}</span>`
                ).join('');

                return `
                    <div class="history-item">
                        <button class="favorite-delete"
                                onclick="PokemonApp.toggleFavoritoDesdeHistorial(${pokemon.id})">
                            🗑️
                        </button>

                        <div class="history-content"
                             onclick="PokemonApp.buscarDirecto('${pokemon.name}')">
                            <img src="${pokemon.sprite}">
                            <div class="history-info">
                                <div class="history-name">
                                    #${pokemon.id} ${pokemon.name.toUpperCase()}
                                </div>
                                <div class="history-types">${tipos}</div>
                            </div>
                        </div>
                    </div>
                `;
            },

            vsScreen() {
                return `
                    <div style="max-width: 1100px; margin: 40px auto; position: relative; text-align: center;">
                        
                        <div style="display: flex; justify-content: center; align-items: flex-start; gap: 40px; margin-bottom: 40px;">
                            
                            <div style="display: flex; filter: drop-shadow(4px 4px 0 black);">
                                <input id="p1" placeholder="POKÉMON 1..." style="width: 200px; padding: 12px; border: 4px solid black; border-right: none; font-family: inherit; font-size: 14px; outline: none; margin-right: 10px;">
                                <button onclick="PokemonApp.buscarParaVS(1)" style="padding: 12px 15px; background: #ff4d4d; border: 4px solid black; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: bold; color: white; white-space: nowrap;">BUSCAR</button>
                            </div>

                            <div style="padding: 8px 15px; font-weight: bold; font-size: 18px; color: #ff4d4d;">VS</div>

                            <div style="display: flex; filter: drop-shadow(4px 4px 0 black);">
                                <input id="p2" placeholder="POKÉMON 2..." style="width: 200px; padding: 12px; border: 4px solid black; border-right: none; font-family: inherit; font-size: 14px; outline: none; margin-right: 10px;">
                                <button onclick="PokemonApp.buscarParaVS(2)" style="padding: 12px 15px; background: #ff4d4d; border: 4px solid black; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: bold; color: white;">BUSCAR</button>
                            </div>
                        </div>

                        <button id="batallar-btn" onclick="PokemonApp.iniciarBatalla()" style="padding: 12px 40px; background: transparent; border: 4px solid black; cursor: pointer; font-family: inherit; font-size: 18px; box-shadow: 5px 5px 0 black; margin-bottom: 30px; font-weight: bold; color: #aaa; text-transform: uppercase;">
                            ⚔️ ¡BATALLAR!
                        </button>

                        <div style="display: flex; justify-content: center; align-items: flex-start; position: relative;">
                            <div id="card-p1" style="width: 200px; height: 350px; border: 5px solid black; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 5px 5px 0 black; color: #ccc; z-index: 1;">?</div>
                            
                            <div style="width: 80px; height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2;">
                                <div style="font-size: 28px; margin: 10px 0;">⚔️</div>
                            </div>
                            
                            <div id="card-p2" style="width: 200px; height: 350px; border: 5px solid black; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 5px 5px 0 black; color: #ccc; z-index: 1;">?</div>
                        </div>

                        <div style="width: 500px; margin: 0 auto; height: 200px; border: 5px solid black; background: white; display: flex; align-items: center; justify-content: center; font-size: 50px; box-shadow: 5px 5px 0 black; color: #ccc; z-index: 5; margin-top: 50px;">
                            ⚔️
                        </div>

                        <div id="resultado-batalla"></div>
                    </div>
                `;
            },

            vsCard(p) {
                const tipos = p.types.map(t => `<div>${t.type.name}</div>`).join("");
                const img = p.sprites.front_default || 
                           p.sprites.other?.["official-artwork"]?.front_default || "";
                const statsTotal = p.stats.reduce((sum, s) => sum + s.base_stat, 0);

                return `
                    <div class="card" style="width: 350px; margin: 0;">
                        <div class="badge-data">⚔️ API</div>
                        
                        <div class="sprite-box">
                            <img src="${img}">
                        </div>

                        <div class="titulo">#${p.id} ${p.name.toUpperCase()}</div>
                        <div class="linea"></div>

                        <div class="tipos">${tipos}</div>
                        
                        <div style="margin-top: 15px; text-align: left;">
                            <b>STATS TOTAL: ${statsTotal}</b>
                        </div>
                    </div>
                `;
            }
        };

        const api = {
            async fetchPokemon(query) {
                const response = await fetch(`${pokeApi}/pokemon/${query}`);
                if (!response.ok) throw new Error('Pokemon not found');
                return response.json();
            },

            async fetchAbility(query) {
                const response = await fetch(`${pokeApi}/ability/${query}`);
                if (!response.ok) throw new Error('Ability not found');
                return response.json();
            },

            async fetchSpecies(id) {
                const response = await fetch(`${pokeApi}/pokemon-species/${id}`);
                return response.json();
            },

            async fetchEvolutionChain(url) {
                const response = await fetch(url);
                return response.json();
            }
        };

        const utils = {
            reproducirGrito(url) {
                if (!url) return;
                
                htmlElements.audio.pause();
                htmlElements.audio.currentTime = 0;

                setTimeout(() => {
                    htmlElements.audio.src = url + "?v=" + Math.random();
                    htmlElements.audio.play();
                }, 50);
            },

            toggleTheme() {
            document.body.classList.toggle("dark");
            localStorage.setItem("tema", document.body.classList.contains("dark") ? "dark" : "light");
            },


            getQueryValue() {
                return htmlElements.inputQuery.value.toLowerCase().trim();
            },

            getModoValue() {
                return htmlElements.selectModo.value;
            },

            setQuery(value) {
                htmlElements.inputQuery.value = value;
            },

            setModo(value) {
                htmlElements.selectModo.value = value;
            },

            switchToSearchView() {
                state.currentView = 'search';
            },

            switchToHistoryView() {
                state.currentView = 'Historico';
                state.history = storage.getHistory();
                render.history();
            }
        };

        const render = {
            pokemon(data, origen) {
                htmlElements.app.innerHTML = templates.pokemon(data, origen);
                },


            ability(ability, effectText, lista) {
                htmlElements.app.innerHTML = templates.ability(ability, effectText, lista);
                state.currentAbility = ability;
            },

            evolutionChain(rootHTML, evoHTML) {
                const evoRootEl = document.getElementById("evo-root");
                const evosEl = document.getElementById("evos");
                
                if (evoRootEl) evoRootEl.innerHTML = rootHTML;
                if (evosEl) evosEl.innerHTML = evoHTML;
            },

            history() {
                htmlElements.app.innerHTML = templates.historyView(state.history);
            },

            favoritos() {
                const favoritos = storage.getFavoritos();
                htmlElements.app.innerHTML = templates.favoritesView(favoritos);
            },

            vs() {
            htmlElements.app.innerHTML = templates.vsScreen();
            state.currentView = 'vs';

            pokemon1 = null;
            pokemon2 = null;

            setTimeout(() => vs.actualizarEstadoBoton(), 0);
            },


            vsCard(p, containerId) {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = templates.vsCard(p);
                }
            }
        };

        const evolution = {
            async cargar(id) {
                try {
                    const species = await api.fetchSpecies(id);
                    const chain = await api.fetchEvolutionChain(species.evolution_chain.url);

                    const { base, ramas, lineal } = this.procesarCadena(chain);
                    await this.renderizar(base, ramas, lineal);
                } catch (error) {
                    console.error("Error cargando evoluciones:", error);
                }
            },

            procesarCadena(evolutionData) {
                const base = evolutionData.chain.species.name;
                const ramas = [];
                const lineal = [];

                const recorrer = (nodo) => {
                    if (!nodo) return;

                    if (nodo.evolves_to.length > 1) {
                        nodo.evolves_to.forEach(evo => {
                            ramas.push(evo.species.name);
                        });
                    } else if (nodo.evolves_to.length === 1) {
                        const siguiente = nodo.evolves_to[0];
                        lineal.push(siguiente.species.name);
                        recorrer(siguiente);
                    }
                };

                recorrer(evolutionData.chain);

                return { base, ramas, lineal };
            },

            async renderizar(base, ramas, lineal) {
                const baseData = await api.fetchPokemon(base);
                let rootHTML = "";
                let evoHTML = "";

                if (ramas.length === 0) {
                    rootHTML = templates.evolutionRoot(base, baseData.sprites.front_default);

                    for (const name of lineal) {
                        const poke = await api.fetchPokemon(name);
                        rootHTML += templates.evolutionArrow();
                        rootHTML += templates.evolutionItem(name, poke.sprites.front_default);
                    }

                    render.evolutionChain(rootHTML, "");
                } else {
                    rootHTML = templates.evolutionRoot(base, baseData.sprites.front_default);
                    rootHTML += templates.evolutionArrow();

                    for (const name of ramas) {
                        const poke = await api.fetchPokemon(name);
                        evoHTML += templates.evolutionItem(name, poke.sprites.front_default);
                    }

                    render.evolutionChain(rootHTML, evoHTML);
                }
            }
        };

        const search = {
            async pokemon(query) {
            try {
                const key = query.toLowerCase().trim();


                // ✅ 2. Intentar CACHE
                const cached = cache.get(key);
                if (cached) {
                state.currentPokemon = cached;
                state.currentOrigen = "cache";

                render.pokemon(cached, "cache");
                evolution.cargar(cached.id);
                utils.reproducirGrito(cached.cries?.latest);
                storage.addToHistory(cached);
                return;
                }

                // ✅ 3. API solo si NO hay cache
                const data = await api.fetchPokemon(key);
                cache.set(key, data);

                state.currentPokemon = data;
                state.currentOrigen = "api";

                render.pokemon(data, "api");
                evolution.cargar(data.id);
                utils.reproducirGrito(data.cries?.latest);
                storage.addToHistory(data);

            } catch (error) {
                alert("❌ Pokémon no encontrado");
                console.error(error);
            }
            },



            async habilidad(query) {
                try {
                    const ability = await api.fetchAbility(query);

                    const effectText = ability.effect_entries
                        .find(e => e.language.name === "en")?.effect
                        || "No description available.";

                    let lista = "";

                    for (const entry of ability.pokemon) {
                        const name = entry.pokemon.name;
                        const isHidden = entry.is_hidden;

                        const pokeUrl = entry.pokemon.url.replace("pokemon-species", "pokemon");
                        const poke = await fetch(pokeUrl).then(r => r.json());

                        const img = poke.sprites.front_default ||
                                  poke.sprites.other?.["official-artwork"]?.front_default ||
                                  "";

                        lista += templates.abilityPokemonItem(name, img, isHidden);
                    }

                    render.ability(ability, effectText, lista);

                } catch (error) {
                    alert("❌ Habilidad no encontrada");
                    console.error(error);
                }
            }
        };

        const vs = {
            efectividad: {
                normal: { rock: 0.5, ghost: 0, steel: 0.5 },
                fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
                water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
                electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
                grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
                ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
                fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
                poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
                ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
                flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
                psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
                bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
                rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
                ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
                dragon: { dragon: 2, steel: 0.5, fairy: 0 },
                dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
                steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
                fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
            },

            calcularVentaja(atacante, defensor) {
                const tiposAtacante = atacante.types.map(t => t.type.name);
                const tiposDefensor = defensor.types.map(t => t.type.name);
                
                let multiplicador = 1;
                
                for (const tipoAtk of tiposAtacante) {
                    for (const tipoDef of tiposDefensor) {
                        if (this.efectividad[tipoAtk] && this.efectividad[tipoAtk][tipoDef] !== undefined) {
                            multiplicador *= this.efectividad[tipoAtk][tipoDef];
                        }
                    }
                }
                
                return multiplicador;
            },

            async buscarPokemon(num) {
                try {
                    const inputId = num === 1 ? "p1" : "p2";
                    const input = document.getElementById(inputId);
                    if (!input) return;

                    const q = input.value.toLowerCase().trim();
                    if (!q) return;

                    let data = cache.get(q);

                    if (!data) {
                        const res = await fetch(`${pokeApi}/pokemon/${q}`);
                        if (!res.ok) {
                            alert(`❌ Pokémon ${num} no encontrado`);
                            return;
                        }
                        data = await res.json();
                        cache.set(q, data);
                    }

                    if (num === 1) {
                        pokemon1 = data;
                        render.vsCard(data, "card-p1");
                    } else {
                        pokemon2 = data;
                        render.vsCard(data, "card-p2");
                    }
                    this.actualizarEstadoBoton();

                } catch (e) {
                    alert("⚠️ Error buscando Pokémon");
                    console.error(e);
                }
            },
            actualizarEstadoBoton() {
                const btn = document.getElementById("batallar-btn");
                if (!btn) return;

                if (pokemon1 && pokemon2) {
                    btn.classList.remove("disabled");
                    btn.style.color = "black";
                    btn.style.background = "#7cf0dc";
                } else {
                    btn.classList.add("disabled");
                    btn.style.color = "#aaa";
                    btn.style.background = "transparent";
                }
                },


            iniciarBatalla() {
                if (!pokemon1 || !pokemon2) {
                    alert("⚠️ Debes buscar ambos Pokémon primero");
                    return;
                }

                const stats1 = pokemon1.stats.reduce((sum, s) => sum + s.base_stat, 0);
                const stats2 = pokemon2.stats.reduce((sum, s) => sum + s.base_stat, 0);

                const ventaja1 = this.calcularVentaja(pokemon1, pokemon2);
                const ventaja2 = this.calcularVentaja(pokemon2, pokemon1);

                const poder1 = stats1 * ventaja1;
                const poder2 = stats2 * ventaja2;

                let mensaje = "";
                let colorGanador = "";

                if (poder1 > poder2) {
                    const ganador = pokemon1.name.toUpperCase();
                    colorGanador = "#7cf0dc";
                    mensaje = `¡${ganador} GANA! 🏆`;
                } else if (poder2 > poder1) {
                    const ganador = pokemon2.name.toUpperCase();
                    colorGanador = "#7cf0dc";
                    mensaje = `¡${ganador} GANA! 🏆`;
                } else {
                    mensaje = "¡EMPATE! ⚔️";
                    colorGanador = "#ffe066";
                }

                const analisis = `
                    <div style="margin-top: 40px;">
                        <div style="background: ${colorGanador}; border: 5px solid black; padding: 20px; box-shadow: 8px 8px 0 black; margin-bottom: 20px;">
                            <h2 style="font-size: 36px; margin: 0;">${mensaje}</h2>
                        </div>

                        <div style="background: white; border: 5px solid black; padding: 20px; box-shadow: 8px 8px 0 black; text-align: left;">
                            <h3>📊 ANÁLISIS DE BATALLA</h3>
                            <div style="margin: 10px 0;">
                                <b>${pokemon1.name.toUpperCase()}</b><br>
                                Stats totales: ${stats1}<br>
                                Ventaja de tipo: ${ventaja1}x<br>
                                Poder final: ${poder1.toFixed(2)}
                            </div>
                            <div style="height: 3px; background: black; margin: 15px 0;"></div>
                            <div style="margin: 10px 0;">
                                <b>${pokemon2.name.toUpperCase()}</b><br>
                                Stats totales: ${stats2}<br>
                                Ventaja de tipo: ${ventaja2}x<br>
                                Poder final: ${poder2.toFixed(2)}
                            </div>
                        </div>
                    </div>
                `;

                const resultadoEl = document.getElementById("resultado-batalla");
                if (resultadoEl) {
                    resultadoEl.innerHTML = analisis;
                }
            }
        };

        const handlers = {
            onSearchTabClick() {
                if (state.currentView !== 'search') {
                    utils.switchToSearchView();
                    htmlElements.app.innerHTML = '';
                }
            },

            onBuscarClick() {
                const query = utils.getQueryValue();
                const modo = utils.getModoValue();

                if (!query) return;

                if (modo === "pokemon") {
                    search.pokemon(query);
                } else if (modo === "habilidad") {
                    search.habilidad(query);
                }
            },

            onTemaClick() {
                utils.toggleTheme();
            },

            onHistoryClick() {
                utils.switchToHistoryView();
            },

            onFavoritosClick() {
                state.currentView = 'Favoritos';
                render.favoritos();
            },

            onVSClick() {
                render.vs();
            }
        };

        return {
            init() {
                if (!htmlElements.btnTema) {
                console.error("Botón de tema no encontrado");
                return;
                }


                if (htmlElements.btnBuscar) {
                htmlElements.btnBuscar.onclick = handlers.onBuscarClick;
                }

                htmlElements.btnTema.onclick = handlers.onTemaClick;
                const menuButtons = document.querySelectorAll('.menu button');
                
                if (menuButtons[0]) menuButtons[0].onclick = handlers.onSearchTabClick;
                if (menuButtons[1]) menuButtons[1].onclick = handlers.onHistoryClick;
                if (menuButtons[2]) menuButtons[2].onclick = handlers.onVSClick;
                if (menuButtons[3]) menuButtons[3].onclick = handlers.onFavoritosClick;

                state.history = storage.getHistory();

                const page = document.body.dataset.page;

                if (page === "historico") {
                state.currentView = 'Historico';
                render.history();
                }

                if (page === "favoritos") {
                state.currentView = 'Favoritos';
                render.favoritos();
                }

                if (page === "vs") {
                render.vs();
                }

                console.log("✅ PokemonApp inicializada");

            },

            buscarDirecto(nombre) {
                utils.setQuery(nombre);
                utils.setModo("pokemon");

                // 🔑 Si el Pokémon ya está cargado y es el mismo
                if (
                    state.currentPokemon &&
                    state.currentPokemon.name === nombre.toLowerCase()
                ) {
                    render.pokemon(state.currentPokemon, state.currentOrigen);
                    return;
                }

                handlers.onBuscarClick();
            },


            buscarPokemonDesdeHabilidad(nombre) {
                utils.setModo("pokemon");
                utils.setQuery(nombre);

                if (
                    state.currentPokemon &&
                    state.currentPokemon.name === nombre.toLowerCase()
                ) {
                    render.pokemon(state.currentPokemon, state.currentOrigen);
                    return;
                }

                handlers.onBuscarClick();
            },


            removeFromHistory(pokemonId) {
                storage.removeFromHistory(pokemonId);
                render.history();
            },

            clearHistory() {
                if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
                    storage.clearHistory();
                    render.history();
                }
            },

            toggleFavorito() {
                if (!state.currentPokemon) return;
                storage.alternarFavorito(state.currentPokemon);
                render.pokemon(state.currentPokemon, state.currentOrigen);
            },


            toggleFavoritoDesdeHistorial(id) {
                const pokemon = storage.getHistory().find(p => p.id === id);
                if (!pokemon) return;

                storage.alternarFavorito(pokemon);
                
                if (state.currentView === 'Favoritos') {
                    render.favoritos();
                } else if (state.currentView === 'Historico') {
                    render.history();
                }
            },

            buscarParaVS(num) {
                vs.buscarPokemon(num);
            },

            iniciarBatalla() {
                vs.iniciarBatalla();
            }
        };
    })();

    window.PokemonApp = PokemonApp;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PokemonApp.init());
    } else {
        PokemonApp.init();
    }
})();