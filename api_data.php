<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Ruta al archivo de datos (fuera del alcance directo del navegador)
$dataFile = __DIR__ . '/data_8f3k2l4m.json';

if (file_exists($dataFile)) {
    // Leer el archivo JSON
    $json = file_get_contents($dataFile);
    $data = json_decode($json, true);

    if ($data && isset($data['productos'])) {
        // Filtrar campos sensibles (costo y ganancia)
        foreach ($data['productos'] as &$producto) {
            unset($producto['costo']);
            unset($producto['ganancia']);
        }
        // Enviar datos filtrados
        echo json_encode($data);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al procesar los datos']);
    }
} else {
    // Enviar error si no existe
    http_response_code(404);
    echo json_encode(['error' => 'Archivo de datos no encontrado']);
}
?>
