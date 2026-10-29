-- =============================================================================
--  Borra los pedidos de PRUEBA (is_test = true) antes de empezar a vender.
--  Ejecútelo en Supabase → SQL Editor cuando termine las pruebas y ANTES de
--  cambiar PAYMENTS_MODE a "live". No toca pedidos reales.
--
--  · Devuelve al inventario las unidades que reservaron los pedidos de prueba.
--  · Borra sus pagos, eventos, envíos e historial.
--  · Borra los clientes que solo existían por pedidos de prueba (y sus direcciones).
--  · La numeración de prueba NO se reinicia: el enlace privado de cada pedido se
--    deriva de su número, así un enlace viejo nunca abre un pedido nuevo.
--  Los productos, precios, zonas, transportistas y ajustes no se modifican.
-- =============================================================================
begin;

select app.release_stock(id) from app.orders where is_test and stock_reserved;

delete from app.payment_events where order_id in (select id from app.orders where is_test);
delete from app.orders where is_test;           -- en cascada: líneas, pagos, envío, historial

delete from app.customers c
where not exists (select 1 from app.orders o where o.customer_id = c.id);

-- Resumen de lo que queda
select (select count(*) from app.orders) as pedidos_reales,
       (select count(*) from app.customers) as clientes;

commit;
