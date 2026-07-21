-- ============================================================================
-- 083_sales_return_ref_batch_serial.sql
--
-- Sales Return now has its own batch_no/serial_no/expiry_date columns
-- (082_sales_order_return_batch_serial.sql), but when a Sales Return is
-- created by referencing a Sales Invoice, the picker had no way to carry the
-- source invoice line's actual batch/serial across — sp_get_sales_docs_for_
-- ref's WHEN 'SI' branch never selected those fields. Adds them so the
-- return line can default to the exact batch/serial (e.g. a Chassis Number)
-- that was originally invoiced, same as every other reference-loading path
-- in this app is expected to carry exact saved values.
--
-- Full CREATE OR REPLACE re-issued from 081_sales_invoice_dc_reference_
-- exclusion.sql; every branch other than SI is byte-for-byte unchanged.
-- ============================================================================

CREATE OR REPLACE PROCEDURE inventory.sp_get_sales_docs_for_ref(
    IN  p_data   JSONB,
    INOUT o_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, public
AS $$
DECLARE
    v_company_id  BIGINT := (p_data->>'company_id')::BIGINT;
    v_doc_type    TEXT   := UPPER(TRIM(p_data->>'doc_type'));
    v_segment_id  BIGINT := NULLIF(p_data->>'segment_id', '')::BIGINT;
    v_customer_id BIGINT := NULLIF(p_data->>'customer_id', '')::BIGINT;
BEGIN
    CASE v_doc_type
        WHEN 'SO' THEN
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doc_type', 'SO',
                'id', s.id,
                'doc_number', s.doc_number,
                'doc_date', s.doc_date,
                'segment_id', s.segment_id,
                'segment_name', s.segment_name,
                'vendor_id', s.customer_id,
                'party_name', s.customer_name,
                'status', s.status,
                'remarks', s.delivery_location,
                'items', (
                    SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'id', i.id,
                        'product_id', i.product_id,
                        'product_name', i.product_name,
                        'product_code', i.product_code,
                        'variant_id', i.variant_id,
                        'variant_name', i.variant_name,
                        'attribute_id', i.attribute_id,
                        'attribute_name', i.attribute_name,
                        'attribute_value', i.attribute_value,
                        'uom_id', i.uom_id,
                        'uom_name', i.uom_name,
                        'qty', i.qty,
                        'rate', i.rate,
                        'discount_pct', i.discount_pct,
                        'gst_rate', i.gst_rate,
                        'delivered_qty', i.delivered_qty,
                        'invoiced_qty', i.invoiced_qty,
                        'remaining_qty', GREATEST(COALESCE(i.qty, 0) - COALESCE(i.delivered_qty, 0), 0)
                    ) ORDER BY i.sno), '[]'::jsonb)
                      FROM inventory.inv_sales_order_items i
                     WHERE i.so_id = s.id
                       AND COALESCE(i.qty, 0) > COALESCE(i.delivered_qty, 0)
                )
            ) ORDER BY s.created_at DESC), '[]'::jsonb)
            INTO o_result
            FROM inventory.inv_sales_orders s
            WHERE s.company_id = v_company_id
              AND LOWER(COALESCE(s.status, 'draft')) = 'posted'
              AND (v_segment_id IS NULL OR s.segment_id = v_segment_id)
              AND (v_customer_id IS NULL OR s.customer_id = v_customer_id)
              AND EXISTS (
                  SELECT 1
                    FROM inventory.inv_sales_order_items i
                   WHERE i.so_id = s.id
                     AND COALESCE(i.qty, 0) > COALESCE(i.delivered_qty, 0)
              );

        WHEN 'SI' THEN
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doc_type', 'SI',
                'id', si.id,
                'doc_number', si.doc_number,
                'doc_date', si.doc_date,
                'segment_id', si.segment_id,
                'segment_name', si.segment_name,
                'warehouse_id', si.warehouse_id,
                'so_id', si.so_id,
                'so_number', si.so_number,
                'vendor_id', si.customer_id,
                'party_name', si.customer_name,
                'status', si.status,
                'remarks', si.warehouse_name,
                'items', (
                    SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'id', i.id,
                        'product_id', i.product_id,
                        'product_name', i.product_name,
                        'product_code', i.product_code,
                        'variant_id', i.variant_id,
                        'variant_name', i.variant_name,
                        'attribute_id', i.attribute_id,
                        'attribute_name', i.attribute_name,
                        'attribute_value', i.attribute_value,
                        'uom_id', i.uom_id,
                        'uom_name', i.uom_name,
                        'qty', i.qty,
                        'returned_qty', COALESCE(ret.returned_qty, 0),
                        'remaining_qty', GREATEST(COALESCE(i.qty, 0) - COALESCE(ret.returned_qty, 0), 0),
                        'rate', i.rate,
                        'gst_rate', i.gst_rate,
                        'batch_no', i.batch_no,
                        'serial_no', i.serial_no,
                        'expiry_date', i.expiry_date
                    ) ORDER BY i.sno), '[]'::jsonb)
                    FROM inventory.inv_sales_invoice_items i
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(SUM(sri.return_qty), 0) AS returned_qty
                          FROM inventory.inv_sales_returns sr
                          JOIN inventory.inv_sales_return_items sri ON sri.return_id = sr.id
                         WHERE sr.company_id = si.company_id
                           AND COALESCE(sr.status, 'draft') <> 'cancelled'
                           AND (sr.invoice_id = si.id OR LOWER(COALESCE(sr.invoice_number, '')) = LOWER(COALESCE(si.doc_number, '')))
                           AND COALESCE(sri.product_id, 0) = COALESCE(i.product_id, 0)
                           AND COALESCE(sri.variant_id, 0) = COALESCE(i.variant_id, 0)
                           AND COALESCE(sri.attribute_id, 0) = COALESCE(i.attribute_id, 0)
                           AND LOWER(COALESCE(sri.product_name, '')) = LOWER(COALESCE(i.product_name, ''))
                           AND LOWER(COALESCE(sri.attribute_value, '')) = LOWER(COALESCE(i.attribute_value, ''))
                    ) ret ON TRUE
                    WHERE i.invoice_id = si.id
                      AND COALESCE(i.qty, 0) > COALESCE(ret.returned_qty, 0)
                      AND NOT EXISTS (
                          SELECT 1
                            FROM inventory.inv_delivery_challan_items dci
                            JOIN inventory.inv_delivery_challans dcx ON dcx.id = dci.dc_id
                           WHERE dci.si_item_id = i.id
                             AND COALESCE(dcx.status, 'draft') <> 'cancelled'
                      )
                )
            ) ORDER BY si.created_at DESC), '[]'::jsonb)
            INTO o_result
            FROM inventory.inv_sales_invoices si
            WHERE si.company_id = v_company_id
              AND LOWER(COALESCE(si.status, 'draft')) = 'posted'
              AND (v_segment_id IS NULL OR si.segment_id = v_segment_id)
              AND (v_customer_id IS NULL OR si.customer_id = v_customer_id)
              AND EXISTS (
                  SELECT 1
                    FROM inventory.inv_sales_invoice_items i
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(SUM(sri.return_qty), 0) AS returned_qty
                          FROM inventory.inv_sales_returns sr
                          JOIN inventory.inv_sales_return_items sri ON sri.return_id = sr.id
                         WHERE sr.company_id = si.company_id
                           AND COALESCE(sr.status, 'draft') <> 'cancelled'
                           AND (sr.invoice_id = si.id OR LOWER(COALESCE(sr.invoice_number, '')) = LOWER(COALESCE(si.doc_number, '')))
                           AND COALESCE(sri.product_id, 0) = COALESCE(i.product_id, 0)
                           AND COALESCE(sri.variant_id, 0) = COALESCE(i.variant_id, 0)
                           AND COALESCE(sri.attribute_id, 0) = COALESCE(i.attribute_id, 0)
                           AND LOWER(COALESCE(sri.product_name, '')) = LOWER(COALESCE(i.product_name, ''))
                           AND LOWER(COALESCE(sri.attribute_value, '')) = LOWER(COALESCE(i.attribute_value, ''))
                    ) ret ON TRUE
                   WHERE i.invoice_id = si.id
                     AND COALESCE(i.qty, 0) > COALESCE(ret.returned_qty, 0)
                     AND NOT EXISTS (
                         SELECT 1
                           FROM inventory.inv_delivery_challan_items dci
                           JOIN inventory.inv_delivery_challans dcx ON dcx.id = dci.dc_id
                          WHERE dci.si_item_id = i.id
                            AND COALESCE(dcx.status, 'draft') <> 'cancelled'
                     )
              );

        WHEN 'DC' THEN
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doc_type', 'DC',
                'id', dc.id,
                'doc_number', dc.dc_number,
                'doc_date', dc.dc_date,
                'segment_id', dc.segment_id,
                'segment_name', dc.segment_name,
                'warehouse_id', dc.from_warehouse_id,
                'vendor_id', dc.customer_id,
                'party_name', dc.customer_name,
                'status', dc.status,
                'remarks', COALESCE(dc.from_warehouse_name, dc.branch_name),
                'items', (
                    SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'id', i.id,
                        'product_id', i.product_id,
                        'product_name', i.product_name,
                        'product_code', i.product_code,
                        'variant_id', i.variant_id,
                        'variant_name', i.variant_name,
                        'attribute_id', i.attribute_id,
                        'attribute_name', i.attribute_name,
                        'attribute_value', i.attribute_value,
                        'uom_id', i.uom_id,
                        'uom_name', i.uom_name,
                        'so_item_id', i.so_item_id,
                        'dispatch_qty', i.dispatch_qty,
                        'invoiced_qty', i.invoiced_qty,
                        'remaining_qty', i.dispatch_qty - i.invoiced_qty
                    ) ORDER BY i.sno), '[]'::jsonb)
                      FROM inventory.inv_delivery_challan_items i
                     WHERE i.dc_id = dc.id
                       AND i.si_item_id IS NULL
                       AND i.dispatch_qty > i.invoiced_qty
                )
            ) ORDER BY dc.created_at DESC), '[]'::jsonb)
            INTO o_result
            FROM inventory.inv_delivery_challans dc
            WHERE dc.company_id = v_company_id
              AND LOWER(COALESCE(dc.status, 'draft')) = 'posted'
              AND (v_segment_id IS NULL OR dc.segment_id = v_segment_id)
              AND (v_customer_id IS NULL OR dc.customer_id = v_customer_id)
              AND EXISTS (
                  SELECT 1
                    FROM inventory.inv_delivery_challan_items i
                   WHERE i.dc_id = dc.id
                     AND i.si_item_id IS NULL
                     AND i.dispatch_qty > i.invoiced_qty
              );

        WHEN 'SALESRETURN' THEN
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doc_type', 'SALESRETURN',
                'id', sr.id,
                'doc_number', sr.return_number,
                'doc_date', sr.return_date,
                'segment_id', sr.segment_id,
                'segment_name', sr.segment_name,
                'vendor_id', sr.customer_id,
                'party_name', sr.customer_name,
                'status', sr.status,
                'remarks', sr.return_reason,
                'items', (
                    SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'product_id', i.product_id,
                        'product_name', i.product_name,
                        'product_code', i.product_code,
                        'variant_id', i.variant_id,
                        'variant_name', i.variant_name,
                        'attribute_id', i.attribute_id,
                        'attribute_name', i.attribute_name,
                        'attribute_value', i.attribute_value,
                        'uom_id', i.uom_id,
                        'uom_name', i.uom_name,
                        'return_qty', i.return_qty,
                        'rate', i.rate,
                        'gst_rate', i.gst_rate,
                        'tax_amount', i.tax_amount,
                        'return_amount', i.return_amount
                    ) ORDER BY i.sno), '[]'::jsonb)
                      FROM inventory.inv_sales_return_items i
                     WHERE i.return_id = sr.id
                )
            ) ORDER BY sr.created_at DESC), '[]'::jsonb)
            INTO o_result
            FROM inventory.inv_sales_returns sr
            WHERE sr.company_id = v_company_id
              AND sr.status IN ('draft', 'posted')
              AND (v_segment_id IS NULL OR sr.segment_id = v_segment_id)
              AND (v_customer_id IS NULL OR sr.customer_id = v_customer_id);

        ELSE
            o_result := '[]'::jsonb;
    END CASE;
END;
$$;
