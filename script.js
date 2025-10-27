// Espera a que todo el HTML esté cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Equivalente a leer el CSV y crear el grafo ---
    // `data` viene del archivo 'metro_data.js'
    
    const elementos = []; // Aquí guardaremos nodos y enlaces
    const nombresEstaciones = new Set(); // Para no duplicar nodos

    // Procesamos los datos (como nx.from_pandas_edgelist)
    data.forEach(linea => {
        // Añade las estaciones (nodos) al Set
        nombresEstaciones.add(linea.Origen);
        nombresEstaciones.add(linea.Destino);

        // Añade los enlaces (edges)
        elementos.push({
            group: 'edges',
            data: {
                id: `${linea.Origen}-${linea.Destino}`, // ID único para el enlace
                source: linea.Origen,
                target: linea.Destino,
                weight: linea.Pesos // Usamos 'weight' para Dijkstra
            }
        });
    });

    // Convertimos el Set de nombres a los objetos de nodo que Cytoscape necesita
    nombresEstaciones.forEach(nombre => {
        elementos.push({
            group: 'nodes',
            data: { id: nombre, label: nombre }
        });
    });
    
    // --- 2. Equivalente a METRO.nodes() y METRO.degree() ---
    // (Opcional: Imprime en la consola los transbordes)
    console.log("Estaciones (Nodos):", Array.from(nombresEstaciones));
    
    const grados = {};
    data.forEach(e => { // Usamos 'data' que es más simple
        grados[e.Origen] = (grados[e.Origen] || 0) + 1;
        grados[e.Destino] = (grados[e.Destino] || 0) + 1;
    });
    
    console.log("--- TRANSBORDES (Grado > 2) ---");
    for (const estacion in grados) {
        if (grados[estacion] > 2) {
            console.log(`${estacion} (Grado: ${grados[estacion]})`);
        }
    }
    console.log("---------------------------------");


    // --- 3. Equivalente a nx.draw(metro, ...) ---
    // Inicializamos Cytoscape.js en el div '#cy'
    const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elementos,
        
        // 'style' es el equivalente a los parámetros de nx.draw()
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                    'label': 'data(label)',
                    'font-size': '10px',
                    'color': '#333',
                    'width': '8px', // Nodos más pequeños
                    'height': '8px'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'curve-style': 'bezier'
                }
            },
            // Estilo especial para la ruta seleccionada
            {
                selector: '.ruta-nodo',
                style: {
                    'background-color': '#007bff',
                    'color': '#000',
                    'font-weight': 'bold',
                    'font-size': '12px',
                    'width': '12px',
                    'height': '12px'
                }
            },
            {
                selector: '.ruta-enlace',
                style: {
                    'line-color': '#007bff',
                    'width': 4
                }
            }
        ],
        // 'layout' organiza el grafo (como plt.show())
        layout: {
            name: 'cose', // Un buen layout automático para redes
            animate: false,
            idealEdgeLength: 100,
            nodeOverlap: 20,
            randomize: true
        }
    });

    // --- 4. Llenar los <select> (dropdowns) ---
    const inicioSelect = document.getElementById('inicio-select');
    const finSelect = document.getElementById('fin-select');
    // Ordenamos alfabéticamente las estaciones
    const estacionesOrdenadas = Array.from(nombresEstaciones).sort();
    
    estacionesOrdenadas.forEach(nombre => {
        const option1 = document.createElement('option');
        option1.value = nombre;
        option1.textContent = nombre;
        inicioSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = nombre;
        option2.textContent = nombre;
        finSelect.appendChild(option2);
    });

    // --- 5. Lógica del botón (Equivalente a tu función 'recorrido') ---
    const calcularBtn = document.getElementById('calcular-btn');
    const resultadoDiv = document.getElementById('resultado');

    calcularBtn.addEventListener('click', function() {
        const inicio = inicioSelect.value;
        const fin = finSelect.value;

        if (!inicio || !fin) {
            resultadoDiv.innerHTML = '<p>Por favor selecciona ambas estaciones.</p>';
            return;
        }
        
        if (inicio === fin) {
            resultadoDiv.innerHTML = '<p>La estación de inicio y fin no pueden ser la misma.</p>';
            return;
        }

        // --- ¡Aquí está la magia! ---
        // Esto es el equivalente a: nx.dijkstra_path(METRO, source=inicio, target=fin, weight='Pesos')
        const dijkstra = cy.elements().dijkstra(
            cy.getElementById(inicio), // Nodo de inicio
            function(edge) {
                return edge.data('weight'); // La función de peso
            },
            false // no dirigido
        );

        // Obtenemos la ruta y la distancia
        const distancia = dijkstra.distanceTo(cy.getElementById(fin));
        const ruta = dijkstra.pathTo(cy.getElementById(fin));
        
        // Manejo de error si no hay ruta
        if (distancia === Infinity || ruta.length === 0) {
            resultadoDiv.innerHTML = `<p>No se encontró una ruta entre <b>${inicio}</b> y <b>${fin}</b>.</p>`;
            // Limpiamos estilos anteriores
            cy.elements().removeClass('ruta-nodo');
            cy.elements().removeClass('ruta-enlace');
            return;
        }

        // --- 6. Mostrar el resultado (Texto) ---
        // Equivalente a tu bucle 'for est in djk_path: print(est)'
        let rutaTexto = '';
        ruta.nodes().forEach((nodo, i) => {
            rutaTexto += nodo.id();
            if (i < ruta.nodes().length - 1) {
                rutaTexto += ' &rarr; '; // Flecha
            }
        });
        
        resultadoDiv.innerHTML = `<p>Estaciones: ${distancia + 1} (Tramos: ${distancia})</p><br><p style="font-size: 0.8em;">${rutaTexto}</p>`;

        
        // --- 7. Mostrar el resultado (Visual) ---
        // Equivalente a: nx.draw(ruta1, ...) y plt.show()
        
        // Primero, limpiamos estilos anteriores
        cy.elements().removeClass('ruta-nodo');
        cy.elements().removeClass('ruta-enlace');

        // Aplicamos el estilo de "ruta" a los nodos y enlaces del camino
        ruta.nodes().addClass('ruta-nodo');
        ruta.edges().addClass('ruta-enlace');

        // Opcional: Centrar y hacer zoom en la ruta
        cy.animate({
            fit: {
                eles: ruta,
                padding: 50 // espacio alrededor
            },
            duration: 500 // duración de la animación
        });
    });

});