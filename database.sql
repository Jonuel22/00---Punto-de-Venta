-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: punto_de_venta
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cajeros`
--

DROP TABLE IF EXISTS `cajeros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cajeros` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cajeros_usuario` (`usuario_id`),
  CONSTRAINT `fk_cajeros_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cajeros`
--

LOCK TABLES `cajeros` WRITE;
/*!40000 ALTER TABLE `cajeros` DISABLE KEYS */;
INSERT INTO `cajeros` VALUES (1,'Administrador','admin@puntoventa.com','',1,'2026-01-28 18:48:53','2026-01-30 18:49:22',1),(2,'Juan Pérez','jperez@puntoventa.com','',1,'2026-01-28 18:48:53','2026-01-29 20:53:03',4),(3,'fede','','',1,'2026-01-29 12:57:09','2026-01-29 12:57:09',3);
/*!40000 ALTER TABLE `cajeros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `cedula` varchar(50) DEFAULT NULL,
  `rnc` varchar(50) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `direccion` text,
  `limite_credito` decimal(10,2) DEFAULT '0.00',
  `balance_actual` decimal(10,2) DEFAULT '0.00',
  `activo` tinyint(1) DEFAULT '1',
  `notas` text,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cedula` (`cedula`),
  UNIQUE KEY `rnc` (`rnc`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,'Cliente General','000-0000000-0',NULL,'(809) 000-0000',NULL,NULL,0.00,0.00,1,'Cliente predeterminado para ventas sin cliente específico','2026-02-05 13:33:32','2026-02-05 13:33:32');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cuadre_caja`
--

DROP TABLE IF EXISTS `cuadre_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cuadre_caja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cajero_id` int NOT NULL,
  `fecha_apertura` datetime NOT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_apertura` decimal(10,2) DEFAULT '0.00',
  `monto_esperado` decimal(10,2) DEFAULT '0.00',
  `monto_real` decimal(10,2) DEFAULT '0.00',
  `diferencia` decimal(10,2) DEFAULT '0.00',
  `total_ventas` decimal(10,2) DEFAULT '0.00',
  `total_transacciones` int DEFAULT '0',
  `estado` enum('abierto','cerrado') DEFAULT 'abierto',
  `observaciones` text,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cuadre_cajero` (`cajero_id`),
  KEY `idx_cuadre_fecha` (`fecha_apertura`,`fecha_cierre`),
  CONSTRAINT `cuadre_caja_ibfk_1` FOREIGN KEY (`cajero_id`) REFERENCES `cajeros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cuadre_caja`
--

LOCK TABLES `cuadre_caja` WRITE;
/*!40000 ALTER TABLE `cuadre_caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `cuadre_caja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cuentas_por_cobrar`
--

DROP TABLE IF EXISTS `cuentas_por_cobrar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cuentas_por_cobrar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int NOT NULL,
  `venta_id` int DEFAULT NULL,
  `tipo` enum('venta','pago','ajuste') DEFAULT 'venta',
  `monto` decimal(10,2) NOT NULL COMMENT 'Positivo = deuda, Negativo = pago',
  `balance_despues` decimal(10,2) NOT NULL COMMENT 'Balance del cliente luego del movimiento',
  `descripcion` text,
  `metodo_pago` enum('efectivo','tarjeta','transferencia','cheque','otros') DEFAULT NULL,
  `referencia` varchar(100) DEFAULT NULL COMMENT 'Número de transacción, cheque, etc.',
  `cajero_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cxc_venta` (`venta_id`),
  KEY `fk_cxc_cajero` (`cajero_id`),
  KEY `idx_cliente_fecha` (`cliente_id`,`fecha`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha` (`fecha`),
  CONSTRAINT `fk_cxc_cajero` FOREIGN KEY (`cajero_id`) REFERENCES `cajeros` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cxc_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cxc_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cuentas_por_cobrar`
--

LOCK TABLES `cuentas_por_cobrar` WRITE;
/*!40000 ALTER TABLE `cuentas_por_cobrar` DISABLE KEYS */;
/*!40000 ALTER TABLE `cuentas_por_cobrar` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_ventas`
--

DROP TABLE IF EXISTS `detalle_ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `cantidad` int DEFAULT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `venta_id` (`venta_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `detalle_ventas_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`),
  CONSTRAINT `detalle_ventas_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `inventario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_ventas`
--

LOCK TABLES `detalle_ventas` WRITE;
/*!40000 ALTER TABLE `detalle_ventas` DISABLE KEYS */;
INSERT INTO `detalle_ventas` VALUES (1,1,1,5,2.75),(2,2,1,15,2.75),(3,3,3,1,250.00),(4,4,3,1,250.00),(5,5,3,1,250.00),(6,6,4,1,120.00),(7,7,4,5,120.00),(8,8,5,1,110.00),(9,9,7,1,320.00),(10,10,6,1,180.00),(11,11,6,1,180.00),(12,12,6,1,180.00),(13,13,9,1,150.00),(14,14,6,1,180.00),(15,15,6,1,180.00),(16,16,8,1,500.00),(17,17,6,1,180.00),(18,17,9,5,150.00),(19,18,8,4,500.00),(20,19,31,5,500.00),(21,20,9,5,150.00),(22,21,5,10,110.00),(23,22,6,2,180.00),(24,23,3,4,250.00),(25,24,4,1,120.00),(26,25,1,1,5.00),(27,26,1,1,5.00),(28,27,7,1,320.00),(29,28,45,8,800.00),(30,28,48,1,100.00),(31,28,50,1,500.00),(32,28,44,1,1500.00),(33,28,42,1,3200.00),(34,28,28,1,200.00),(35,28,8,1,500.00),(36,29,7,1,320.00),(37,30,1,1,5.00),(38,31,1,1,5.00),(39,31,26,1,450.00),(40,32,10,1,200.00),(41,33,8,1,500.00),(42,34,1,1,5.00),(43,35,3,1,250.00),(44,36,31,5,500.00),(45,37,9,1,150.00),(46,38,3,2,250.00),(47,39,1,1,5.00),(48,40,7,1,320.00),(49,41,9,8,150.00),(50,42,10,3,200.00),(51,43,10,1,200.00),(52,44,7,3,320.00),(53,44,22,3,50.00),(54,44,35,5,6500.00),(55,45,1,1,5.00),(56,46,4,5,120.00),(57,47,1,1,5.00),(58,48,1,1,5.00),(59,49,4,1,120.00);
/*!40000 ALTER TABLE `detalle_ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventario`
--

DROP TABLE IF EXISTS `inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `cantidad` int NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `codigo_barras` char(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario`
--

LOCK TABLES `inventario` WRITE;
/*!40000 ALTER TABLE `inventario` DISABLE KEYS */;
INSERT INTO `inventario` VALUES (1,'Sierra Circular 7 1/4\"','Sierra Electrica',16,5.00,''),(3,'Martillo','Martillo de acero con mango de goma',0,250.00,NULL),(4,'Destornillador Phillips','Destornillador de estrella de 6 pulgadas',2,120.00,NULL),(5,'Destornillador Plano','Destornillador plano de 6 pulgadas',4,110.00,NULL),(6,'Alicate de Corte','Alicate de acero inoxidable con mango ergonómico',0,180.00,NULL),(7,'Llave Inglesa','Llave ajustable de 10 pulgadas',5,320.00,NULL),(8,'Llave de Boca Fija','Juego de llaves fijas de diferentes medidas',3,500.00,NULL),(9,'Cinta Métrica','Cinta métrica de 5 metros con bloqueo',0,150.00,NULL),(10,'Flexómetro','Flexómetro de 3 metros con carcasa reforzada',13,200.00,NULL),(11,'Nivel de Burbuja','Nivel de burbuja de 12 pulgadas con triple indicador',10,250.00,NULL),(12,'Sierra Manual','Sierra para madera de 18 pulgadas con mango ergonómico',8,270.00,NULL),(13,'Segueta','Segueta de acero con mango plástico',15,100.00,NULL),(14,'Serrucho','Serrucho con hoja de acero templado',10,350.00,NULL),(15,'Taladro Percutor','Taladro eléctrico de 600W con velocidad variable',5,1800.00,NULL),(16,'Brocas para Madera','Juego de 10 brocas para madera',12,400.00,NULL),(17,'Brocas para Metal','Juego de 10 brocas para metal',10,500.00,NULL),(18,'Brocas para Concreto','Juego de 5 brocas con punta de carburo',8,600.00,NULL),(19,'Lijadora Eléctrica','Lijadora de 300W con velocidad ajustable',4,2200.00,NULL),(20,'Pulidora Angular','Pulidora de 750W con disco de 4.5 pulgadas',6,2800.00,NULL),(21,'Cepillo de Carpintero','Cepillo manual para madera con cuchilla ajustable',10,750.00,NULL),(22,'Cinta Aislante','Cinta aislante de PVC de 10 metros',22,50.00,NULL),(23,'Cinta Doble Cara','Cinta adhesiva doble cara de alta resistencia',20,90.00,NULL),(24,'Pegamento de Contacto','Pegamento de contacto de 100ml',18,120.00,NULL),(26,'Pistola de Silicona','Pistola de silicona de 40W con interruptor',9,450.00,NULL),(27,'Clavos para Madera','Clavos galvanizados de 2 pulgadas (paquete de 500)',30,180.00,NULL),(28,'Tornillos para Madera','Tornillos de 1 pulgada para madera (paquete de 200)',24,200.00,NULL),(29,'Tuercas y Arandelas','Juego de 100 tuercas y arandelas metálicas',20,250.00,NULL),(30,'Bisagras Metálicas','Par de bisagras metálicas de 3 pulgadas',12,300.00,NULL),(31,'Candado de Seguridad','Candado de acero inoxidable con llave',0,500.00,NULL),(32,'Pasador de Seguridad','Pasador de seguridad metálico de 6 pulgadas',15,280.00,NULL),(33,'Cerradura para Puerta','Cerradura de embutir con llave',8,1200.00,NULL),(34,'Manija para Puerta','Manija metálica con acabado cromado',10,850.00,NULL),(35,'Cerradura Digital','Cerradura electrónica con lector de huella',0,6500.00,NULL),(36,'Llaves Allen','Juego de 10 llaves Allen de diferentes tamaños',15,450.00,NULL),(37,'Llaves Torx','Juego de 8 llaves Torx de acero inoxidable',12,500.00,NULL),(38,'Cortafrío','Cortafrío de acero con mango antideslizante',10,300.00,NULL),(39,'Machete','Machete con hoja de acero inoxidable de 24 pulgadas',7,600.00,NULL),(40,'Hacha de Mano','Hacha de 1.5kg con mango de madera',6,850.00,NULL),(41,'Pala','Pala de punta con mango largo de madera',10,950.00,NULL),(42,'Carretilla','Carretilla metálica con rueda reforzada',3,3200.00,NULL),(43,'Escalera de Aluminio','Escalera plegable de 6 escalones',5,4800.00,NULL),(44,'Manguera para Jardín','Manguera reforzada de 15 metros',11,1500.00,NULL),(45,'Aspersor para Jardín','Aspersor giratorio de 3 brazos',0,800.00,NULL),(46,'Llave de Paso','Llave de paso para agua de 1/2 pulgada',15,250.00,NULL),(47,'Válvula de Esfera','Válvula de esfera de bronce de 3/4 pulgada',10,600.00,NULL),(48,'Cinta de Teflón','Cinta selladora de 10 metros',24,100.00,NULL),(49,'Foco LED','Foco LED de 10W luz blanca',30,150.00,NULL),(50,'Regleta Eléctrica','Regleta de 5 tomas con protección contra sobrecarga',9,500.00,NULL);
/*!40000 ALTER TABLE `inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logos_configuracion`
--

DROP TABLE IF EXISTS `logos_configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logos_configuracion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `activo` tinyint(1) DEFAULT '0',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logos_configuracion`
--

LOCK TABLES `logos_configuracion` WRITE;
/*!40000 ALTER TABLE `logos_configuracion` DISABLE KEYS */;
INSERT INTO `logos_configuracion` VALUES (1,'Logo 1769777357165','jpg',0,'2026-01-30 12:49:17','logo_1769777357163.jpg','2026-01-30 08:49:17'),(2,'Logo 1769777452879','jpg',0,'2026-01-30 12:50:52','logo_1769777452876.jpg','2026-01-30 08:50:52'),(3,'Logo 1769777473463','jpg',0,'2026-01-30 12:51:13','logo_1769777473459.jpg','2026-01-30 08:51:13'),(4,'Logo 1769777642100','png',0,'2026-01-30 12:54:02','logo_1769777642097.png','2026-01-30 08:54:02');
/*!40000 ALTER TABLE `logos_configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_caja`
--

DROP TABLE IF EXISTS `movimientos_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_caja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cuadre_id` int NOT NULL,
  `tipo` enum('entrada','salida','venta') NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `venta_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `venta_id` (`venta_id`),
  KEY `idx_movimientos_cuadre` (`cuadre_id`),
  CONSTRAINT `movimientos_caja_ibfk_1` FOREIGN KEY (`cuadre_id`) REFERENCES `cuadre_caja` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_caja_ibfk_2` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_caja`
--

LOCK TABLES `movimientos_caja` WRITE;
/*!40000 ALTER TABLE `movimientos_caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `movimientos_caja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mensaje` varchar(255) DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` VALUES (47,'Venta realizada - Total: RD$ 5.90','2026-01-30 15:25:40'),(48,'Venta realizada por Administrador del Sistema: Cliente - Total: $5.90','2026-01-30 15:25:40'),(49,'Venta realizada - Total: RD$ 708.00','2026-01-30 15:27:25'),(50,'Venta realizada por juan: Cliente - Total: $708.00','2026-01-30 15:27:25'),(51,'Venta realizada - Total: RD$ 5.90','2026-01-30 16:02:52'),(52,'Venta realizada por juan: Cliente - Total: $5.90','2026-01-30 16:02:52'),(53,'Venta realizada por Administrador del Sistema: Cliente - Total: $5.90','2026-02-02 14:28:28'),(54,'Venta realizada por Administrador del Sistema: Cliente - Total: $141.60','2026-02-02 14:28:53');
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','cajero','supervisor') NOT NULL DEFAULT 'cajero',
  `cajero_id` int DEFAULT NULL,
  `nombre_completo` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuarios_rol` (`rol`),
  KEY `idx_usuarios_cajero` (`cajero_id`),
  CONSTRAINT `fk_usuarios_cajero` FOREIGN KEY (`cajero_id`) REFERENCES `cajeros` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','$2b$10$RGDmq1VxBLotocmEIg7pIOif/QVC71.3kA4vH2h8fkwJnUVEmZZMK','admin',1,'Administrador del Sistema',1,'2026-01-29 12:50:25','2026-01-30 18:49:22'),(3,'fede','$2b$10$9i0K1Vsv0NLsDuPaJr2TFO8WAXib0Dy1pVpRu8Es4APYNokjKr2Yy','cajero',NULL,'fede',1,'2026-01-29 12:57:09','2026-01-29 20:53:03'),(4,'juan','$2b$10$/zTKAz6gVD3OScyWRVW3FOilPI1wyk2cxflNJmSNPsrGuS4XQly/m','cajero',2,'juan',1,'2026-01-29 20:52:55','2026-01-29 20:53:03');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ventas`
--

DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL,
  `cliente_nombre` varchar(100) DEFAULT NULL,
  `cliente_rnc` varchar(20) DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `itbis` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `cajero_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ventas_cajero` (`cajero_id`),
  KEY `fk_ventas_cliente` (`cliente_id`),
  CONSTRAINT `fk_ventas_cajero` FOREIGN KEY (`cajero_id`) REFERENCES `cajeros` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
INSERT INTO `ventas` VALUES (1,'2025-09-16 10:54:47','','',NULL,13.75,2.48,16.23,NULL),(2,'2025-09-16 11:01:28','','',NULL,41.25,7.42,48.67,NULL),(3,'2025-09-16 11:05:02','','',NULL,250.00,45.00,295.00,NULL),(4,'2025-09-16 11:06:50','','',NULL,250.00,45.00,295.00,NULL),(5,'2025-09-16 14:57:40','','',NULL,250.00,45.00,295.00,NULL),(6,'2025-09-16 14:59:30','','',NULL,120.00,21.60,141.60,NULL),(7,'2025-09-16 15:21:31','Jeison De Los Santos','',NULL,600.00,108.00,708.00,NULL),(8,'2025-09-16 15:27:07','','',NULL,110.00,19.80,129.80,NULL),(9,'2025-09-16 15:29:21','','',NULL,320.00,57.60,377.60,NULL),(10,'2025-09-16 15:30:28','','',NULL,180.00,32.40,212.40,NULL),(11,'2025-09-16 15:35:37','','',NULL,180.00,32.40,212.40,NULL),(12,'2025-09-16 15:48:27','','',NULL,180.00,32.40,212.40,NULL),(13,'2025-09-16 15:51:29','','',NULL,150.00,27.00,177.00,NULL),(14,'2025-09-16 15:52:38','','',NULL,180.00,32.40,212.40,NULL),(15,'2025-09-16 15:54:43','','',NULL,180.00,32.40,212.40,NULL),(16,'2025-09-16 15:58:51','','',NULL,500.00,90.00,590.00,NULL),(17,'2025-09-16 16:03:22','Jordy','',NULL,930.00,167.40,1097.40,NULL),(18,'2025-09-16 16:16:14','Jonuel','40237396748',NULL,2000.00,360.00,2360.00,NULL),(19,'2025-10-15 16:52:49','','',NULL,2500.00,450.00,2950.00,NULL),(20,'2025-11-11 16:26:08','Raul Fernandez','40245687418',NULL,750.00,135.00,885.00,NULL),(21,'2025-11-11 17:41:16','','',NULL,1100.00,198.00,1298.00,NULL),(22,'2025-12-12 16:26:41','','',NULL,360.00,64.80,424.80,NULL),(23,'2026-01-22 08:48:37','','',NULL,1000.00,180.00,1180.00,NULL),(24,'2026-01-22 09:24:40','','',NULL,120.00,21.60,141.60,NULL),(25,'2026-01-23 11:14:17','','',NULL,5.00,0.90,5.90,NULL),(26,'2026-01-23 11:40:08','','',NULL,5.00,0.90,5.90,NULL),(27,'2026-01-23 11:54:10','','',NULL,320.00,57.60,377.60,NULL),(28,'2026-01-23 13:13:42','','',NULL,12400.00,2232.00,14632.00,NULL),(29,'2026-01-27 11:23:43','','',NULL,320.00,57.60,377.60,NULL),(30,'2026-01-27 11:29:04','','',NULL,5.00,0.90,5.90,NULL),(31,'2026-01-27 11:33:11','','',NULL,455.00,81.90,536.90,NULL),(32,'2026-01-27 11:33:55','','',NULL,200.00,36.00,236.00,NULL),(33,'2026-01-27 11:34:11','','',NULL,500.00,90.00,590.00,NULL),(34,'2026-01-27 11:34:43','','',NULL,5.00,0.90,5.90,NULL),(35,'2026-01-27 11:49:23','','',NULL,250.00,45.00,295.00,NULL),(36,'2026-01-27 16:36:53','','',NULL,2500.00,450.00,2950.00,NULL),(37,'2026-01-27 16:49:56','','',NULL,150.00,27.00,177.00,NULL),(38,'2026-01-27 16:54:15','','',NULL,500.00,90.00,590.00,NULL),(39,'2026-01-27 17:02:01','','',NULL,5.00,0.90,5.90,NULL),(40,'2026-01-28 10:42:43','','',NULL,320.00,57.60,377.60,NULL),(41,'2026-01-29 09:00:06','','',NULL,1200.00,216.00,1416.00,NULL),(42,'2026-01-29 09:00:56','Jonuel','',NULL,600.00,108.00,708.00,NULL),(43,'2026-01-30 14:28:03','','',NULL,200.00,36.00,236.00,NULL),(44,'2026-01-30 14:45:24','Federiko','',NULL,33610.00,6049.80,39659.80,NULL),(45,'2026-01-30 15:25:40','','',NULL,5.00,0.90,5.90,1),(46,'2026-01-30 15:27:25','','',NULL,600.00,108.00,708.00,2),(47,'2026-01-30 16:02:52','','',NULL,5.00,0.90,5.90,2),(48,'2026-02-02 14:28:28','','',NULL,5.00,0.90,5.90,1),(49,'2026-02-02 14:28:53','','',NULL,120.00,21.60,141.60,1);
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vista_cajeros_completa`
--

DROP TABLE IF EXISTS `vista_cajeros_completa`;
/*!50001 DROP VIEW IF EXISTS `vista_cajeros_completa`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_cajeros_completa` AS SELECT 
 1 AS `cajero_id`,
 1 AS `nombre`,
 1 AS `email`,
 1 AS `telefono`,
 1 AS `cajero_activo`,
 1 AS `usuario_id`,
 1 AS `username`,
 1 AS `rol`,
 1 AS `usuario_activo`,
 1 AS `fecha_creacion`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_cuadres_detallada`
--

DROP TABLE IF EXISTS `vista_cuadres_detallada`;
/*!50001 DROP VIEW IF EXISTS `vista_cuadres_detallada`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_cuadres_detallada` AS SELECT 
 1 AS `id`,
 1 AS `cajero_id`,
 1 AS `cajero_nombre`,
 1 AS `cajero_usuario`,
 1 AS `fecha_apertura`,
 1 AS `fecha_cierre`,
 1 AS `monto_apertura`,
 1 AS `monto_esperado`,
 1 AS `monto_real`,
 1 AS `diferencia`,
 1 AS `total_ventas`,
 1 AS `total_transacciones`,
 1 AS `estado`,
 1 AS `observaciones`,
 1 AS `horas_apertura`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vista_cajeros_completa`
--

/*!50001 DROP VIEW IF EXISTS `vista_cajeros_completa`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_cajeros_completa` AS select `c`.`id` AS `cajero_id`,`c`.`nombre` AS `nombre`,`c`.`email` AS `email`,`c`.`telefono` AS `telefono`,`c`.`activo` AS `cajero_activo`,`u`.`id` AS `usuario_id`,`u`.`username` AS `username`,`u`.`rol` AS `rol`,`u`.`activo` AS `usuario_activo`,`c`.`fecha_creacion` AS `fecha_creacion` from (`cajeros` `c` left join `usuarios` `u` on((`c`.`usuario_id` = `u`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_cuadres_detallada`
--

/*!50001 DROP VIEW IF EXISTS `vista_cuadres_detallada`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_cuadres_detallada` AS select `cc`.`id` AS `id`,`cc`.`cajero_id` AS `cajero_id`,`c`.`nombre` AS `cajero_nombre`,`u`.`username` AS `cajero_usuario`,`cc`.`fecha_apertura` AS `fecha_apertura`,`cc`.`fecha_cierre` AS `fecha_cierre`,`cc`.`monto_apertura` AS `monto_apertura`,`cc`.`monto_esperado` AS `monto_esperado`,`cc`.`monto_real` AS `monto_real`,`cc`.`diferencia` AS `diferencia`,`cc`.`total_ventas` AS `total_ventas`,`cc`.`total_transacciones` AS `total_transacciones`,`cc`.`estado` AS `estado`,`cc`.`observaciones` AS `observaciones`,timestampdiff(HOUR,`cc`.`fecha_apertura`,coalesce(`cc`.`fecha_cierre`,now())) AS `horas_apertura` from ((`cuadre_caja` `cc` join `cajeros` `c` on((`cc`.`cajero_id` = `c`.`id`))) left join `usuarios` `u` on((`c`.`usuario_id` = `u`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-01 16:24:00
