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
  `usuario` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cajeros`
--

LOCK TABLES `cajeros` WRITE;
/*!40000 ALTER TABLE `cajeros` DISABLE KEYS */;
INSERT INTO `cajeros` VALUES (1,'Administrador','admin','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','admin@puntoventa.com',NULL,1,'2026-01-28 18:48:53','2026-01-28 18:48:53'),(2,'Juan Pérez','jperez','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','jperez@puntoventa.com',NULL,1,'2026-01-28 18:48:53','2026-01-28 18:48:53');
/*!40000 ALTER TABLE `cajeros` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_ventas`
--

LOCK TABLES `detalle_ventas` WRITE;
/*!40000 ALTER TABLE `detalle_ventas` DISABLE KEYS */;
INSERT INTO `detalle_ventas` VALUES (1,1,1,5,2.75),(2,2,1,15,2.75),(3,3,3,1,250.00),(4,4,3,1,250.00),(5,5,3,1,250.00),(6,6,4,1,120.00),(7,7,4,5,120.00),(8,8,5,1,110.00),(9,9,7,1,320.00),(10,10,6,1,180.00),(11,11,6,1,180.00),(12,12,6,1,180.00),(13,13,9,1,150.00),(14,14,6,1,180.00),(15,15,6,1,180.00),(16,16,8,1,500.00),(17,17,6,1,180.00),(18,17,9,5,150.00),(19,18,8,4,500.00),(20,19,31,5,500.00),(21,20,9,5,150.00),(22,21,5,10,110.00),(23,22,6,2,180.00),(24,23,3,4,250.00),(25,24,4,1,120.00),(26,25,1,1,5.00),(27,26,1,1,5.00),(28,27,7,1,320.00),(29,28,45,8,800.00),(30,28,48,1,100.00),(31,28,50,1,500.00),(32,28,44,1,1500.00),(33,28,42,1,3200.00),(34,28,28,1,200.00),(35,28,8,1,500.00),(36,29,7,1,320.00),(37,30,1,1,5.00),(38,31,1,1,5.00),(39,31,26,1,450.00),(40,32,10,1,200.00),(41,33,8,1,500.00),(42,34,1,1,5.00),(43,35,3,1,250.00),(44,36,31,5,500.00),(45,37,9,1,150.00),(46,38,3,2,250.00),(47,39,1,1,5.00),(48,40,7,1,320.00);
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
INSERT INTO `inventario` VALUES (1,'Sierra Circular 7 1/4\"','Sierra Electrica',19,5.00,''),(3,'Martillo','Martillo de acero con mango de goma',0,250.00,NULL),(4,'Destornillador Phillips','Destornillador de estrella de 6 pulgadas',8,120.00,NULL),(5,'Destornillador Plano','Destornillador plano de 6 pulgadas',4,110.00,NULL),(6,'Alicate de Corte','Alicate de acero inoxidable con mango ergonómico',0,180.00,NULL),(7,'Llave Inglesa','Llave ajustable de 10 pulgadas',8,320.00,NULL),(8,'Llave de Boca Fija','Juego de llaves fijas de diferentes medidas',3,500.00,NULL),(9,'Cinta Métrica','Cinta métrica de 5 metros con bloqueo',8,150.00,NULL),(10,'Flexómetro','Flexómetro de 3 metros con carcasa reforzada',17,200.00,NULL),(11,'Nivel de Burbuja','Nivel de burbuja de 12 pulgadas con triple indicador',10,250.00,NULL),(12,'Sierra Manual','Sierra para madera de 18 pulgadas con mango ergonómico',8,270.00,NULL),(13,'Segueta','Segueta de acero con mango plástico',15,100.00,NULL),(14,'Serrucho','Serrucho con hoja de acero templado',10,350.00,NULL),(15,'Taladro Percutor','Taladro eléctrico de 600W con velocidad variable',5,1800.00,NULL),(16,'Brocas para Madera','Juego de 10 brocas para madera',12,400.00,NULL),(17,'Brocas para Metal','Juego de 10 brocas para metal',10,500.00,NULL),(18,'Brocas para Concreto','Juego de 5 brocas con punta de carburo',8,600.00,NULL),(19,'Lijadora Eléctrica','Lijadora de 300W con velocidad ajustable',4,2200.00,NULL),(20,'Pulidora Angular','Pulidora de 750W con disco de 4.5 pulgadas',6,2800.00,NULL),(21,'Cepillo de Carpintero','Cepillo manual para madera con cuchilla ajustable',10,750.00,NULL),(22,'Cinta Aislante','Cinta aislante de PVC de 10 metros',25,50.00,NULL),(23,'Cinta Doble Cara','Cinta adhesiva doble cara de alta resistencia',20,90.00,NULL),(24,'Pegamento de Contacto','Pegamento de contacto de 100ml',18,120.00,NULL),(26,'Pistola de Silicona','Pistola de silicona de 40W con interruptor',9,450.00,NULL),(27,'Clavos para Madera','Clavos galvanizados de 2 pulgadas (paquete de 500)',30,180.00,NULL),(28,'Tornillos para Madera','Tornillos de 1 pulgada para madera (paquete de 200)',24,200.00,NULL),(29,'Tuercas y Arandelas','Juego de 100 tuercas y arandelas metálicas',20,250.00,NULL),(30,'Bisagras Metálicas','Par de bisagras metálicas de 3 pulgadas',12,300.00,NULL),(31,'Candado de Seguridad','Candado de acero inoxidable con llave',0,500.00,NULL),(32,'Pasador de Seguridad','Pasador de seguridad metálico de 6 pulgadas',15,280.00,NULL),(33,'Cerradura para Puerta','Cerradura de embutir con llave',8,1200.00,NULL),(34,'Manija para Puerta','Manija metálica con acabado cromado',10,850.00,NULL),(35,'Cerradura Digital','Cerradura electrónica con lector de huella',5,6500.00,NULL),(36,'Llaves Allen','Juego de 10 llaves Allen de diferentes tamaños',15,450.00,NULL),(37,'Llaves Torx','Juego de 8 llaves Torx de acero inoxidable',12,500.00,NULL),(38,'Cortafrío','Cortafrío de acero con mango antideslizante',10,300.00,NULL),(39,'Machete','Machete con hoja de acero inoxidable de 24 pulgadas',7,600.00,NULL),(40,'Hacha de Mano','Hacha de 1.5kg con mango de madera',6,850.00,NULL),(41,'Pala','Pala de punta con mango largo de madera',10,950.00,NULL),(42,'Carretilla','Carretilla metálica con rueda reforzada',3,3200.00,NULL),(43,'Escalera de Aluminio','Escalera plegable de 6 escalones',5,4800.00,NULL),(44,'Manguera para Jardín','Manguera reforzada de 15 metros',11,1500.00,NULL),(45,'Aspersor para Jardín','Aspersor giratorio de 3 brazos',0,800.00,NULL),(46,'Llave de Paso','Llave de paso para agua de 1/2 pulgada',15,250.00,NULL),(47,'Válvula de Esfera','Válvula de esfera de bronce de 3/4 pulgada',10,600.00,NULL),(48,'Cinta de Teflón','Cinta selladora de 10 metros',24,100.00,NULL),(49,'Foco LED','Foco LED de 10W luz blanca',30,150.00,NULL),(50,'Regleta Eléctrica','Regleta de 5 tomas con protección contra sobrecarga',9,500.00,NULL);
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
  `tipo` varchar(20) NOT NULL,
  `imagen` longblob NOT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logos_configuracion`
--

LOCK TABLES `logos_configuracion` WRITE;
/*!40000 ALTER TABLE `logos_configuracion` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` VALUES (35,'Venta realizada - Total: RD$ 5.90','2026-01-27 17:02:01'),(36,'Venta realizada: Sin nombre - Total: $5.90','2026-01-27 17:02:01'),(37,'Venta realizada - Total: RD$ 377.60','2026-01-28 10:42:43'),(38,'Venta realizada: Sin nombre - Total: $377.60','2026-01-28 10:42:43');
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','12345');
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
  `subtotal` decimal(10,2) DEFAULT NULL,
  `itbis` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `cajero_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ventas_cajero` (`cajero_id`),
  CONSTRAINT `fk_ventas_cajero` FOREIGN KEY (`cajero_id`) REFERENCES `cajeros` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
INSERT INTO `ventas` VALUES (1,'2025-09-16 10:54:47','','',13.75,2.48,16.23,NULL),(2,'2025-09-16 11:01:28','','',41.25,7.42,48.67,NULL),(3,'2025-09-16 11:05:02','','',250.00,45.00,295.00,NULL),(4,'2025-09-16 11:06:50','','',250.00,45.00,295.00,NULL),(5,'2025-09-16 14:57:40','','',250.00,45.00,295.00,NULL),(6,'2025-09-16 14:59:30','','',120.00,21.60,141.60,NULL),(7,'2025-09-16 15:21:31','Jeison De Los Santos','',600.00,108.00,708.00,NULL),(8,'2025-09-16 15:27:07','','',110.00,19.80,129.80,NULL),(9,'2025-09-16 15:29:21','','',320.00,57.60,377.60,NULL),(10,'2025-09-16 15:30:28','','',180.00,32.40,212.40,NULL),(11,'2025-09-16 15:35:37','','',180.00,32.40,212.40,NULL),(12,'2025-09-16 15:48:27','','',180.00,32.40,212.40,NULL),(13,'2025-09-16 15:51:29','','',150.00,27.00,177.00,NULL),(14,'2025-09-16 15:52:38','','',180.00,32.40,212.40,NULL),(15,'2025-09-16 15:54:43','','',180.00,32.40,212.40,NULL),(16,'2025-09-16 15:58:51','','',500.00,90.00,590.00,NULL),(17,'2025-09-16 16:03:22','Jordy','',930.00,167.40,1097.40,NULL),(18,'2025-09-16 16:16:14','Jonuel','40237396748',2000.00,360.00,2360.00,NULL),(19,'2025-10-15 16:52:49','','',2500.00,450.00,2950.00,NULL),(20,'2025-11-11 16:26:08','Raul Fernandez','40245687418',750.00,135.00,885.00,NULL),(21,'2025-11-11 17:41:16','','',1100.00,198.00,1298.00,NULL),(22,'2025-12-12 16:26:41','','',360.00,64.80,424.80,NULL),(23,'2026-01-22 08:48:37','','',1000.00,180.00,1180.00,NULL),(24,'2026-01-22 09:24:40','','',120.00,21.60,141.60,NULL),(25,'2026-01-23 11:14:17','','',5.00,0.90,5.90,NULL),(26,'2026-01-23 11:40:08','','',5.00,0.90,5.90,NULL),(27,'2026-01-23 11:54:10','','',320.00,57.60,377.60,NULL),(28,'2026-01-23 13:13:42','','',12400.00,2232.00,14632.00,NULL),(29,'2026-01-27 11:23:43','','',320.00,57.60,377.60,NULL),(30,'2026-01-27 11:29:04','','',5.00,0.90,5.90,NULL),(31,'2026-01-27 11:33:11','','',455.00,81.90,536.90,NULL),(32,'2026-01-27 11:33:55','','',200.00,36.00,236.00,NULL),(33,'2026-01-27 11:34:11','','',500.00,90.00,590.00,NULL),(34,'2026-01-27 11:34:43','','',5.00,0.90,5.90,NULL),(35,'2026-01-27 11:49:23','','',250.00,45.00,295.00,NULL),(36,'2026-01-27 16:36:53','','',2500.00,450.00,2950.00,NULL),(37,'2026-01-27 16:49:56','','',150.00,27.00,177.00,NULL),(38,'2026-01-27 16:54:15','','',500.00,90.00,590.00,NULL),(39,'2026-01-27 17:02:01','','',5.00,0.90,5.90,NULL),(40,'2026-01-28 10:42:43','','',320.00,57.60,377.60,NULL);
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-28 16:35:38
