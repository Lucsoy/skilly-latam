<?php
/**
 * GET /api/categorias/
 * Respuesta: Categoria[] (con subcategorias anidadas)
 */
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderError('validacion', 'Metodo no permitido.', 405);
}

try {
    $db = conectarDB();

    // Categorias
    $stmt = $db->query('SELECT * FROM categorias ORDER BY nombre');
    $categorias = $stmt->fetchAll();

    // Subcategorias
    $stmt = $db->query('SELECT * FROM subcategorias ORDER BY nombre');
    $todasSub = $stmt->fetchAll();

    // Agrupar subcategorias por categoria
    $subPorCategoria = [];
    foreach ($todasSub as $sub) {
        $catId = $sub['categoria_id'];
        if (!isset($subPorCategoria[$catId])) {
            $subPorCategoria[$catId] = [];
        }
        $subPorCategoria[$catId][] = [
            'id' => $sub['id'],
            'categoriaId' => $sub['categoria_id'],
            'nombre' => $sub['nombre'],
        ];
    }

    // Armar respuesta
    $resultado = [];
    foreach ($categorias as $cat) {
        $resultado[] = [
            'id' => $cat['id'],
            'nombre' => $cat['nombre'],
            'descripcion' => $cat['descripcion'],
            'subcategorias' => $subPorCategoria[$cat['id']] ?? [],
        ];
    }

    responderJSON($resultado);
} catch (PDOException $e) {
    // El detalle técnico va al log del servidor, nunca al cliente (INC-08).
    error_log('API categorías: ' . $e->getMessage());
    responderError('red', 'No se pudieron obtener las categorías.', 500);
}
