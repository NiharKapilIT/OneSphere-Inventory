-- ============================================================================
-- 082_sales_order_return_batch_serial.sql
--
-- Sales Invoice already tracks batch_no/serial_no/expiry_date per line
-- (032_sales_transactions.sql). Sales Order and Sales Return had no such
-- columns at all, so there was nowhere to save what a user typed into a
-- Serial No field (e.g. a vehicle Chassis Number) on those two screens.
-- Adds the same three columns to inv_sales_order_items and
-- inv_sales_return_items, and re-issues their get/save procedures to
-- read/write them. Everything else in these procedures is byte-for-byte
-- unchanged from 075_sales_order_due_date.sql / 072_sales_dc_return_
-- attribute_scope.sql.
-- ============================================================================

ALTER TABLE inventory.inv_sales_order_items
    ADD COLUMN IF NOT EXISTS batch_no    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS serial_no   TEXT,
    ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE inventory.inv_sales_return_items
    ADD COLUMN IF NOT EXISTS batch_no    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS serial_no   TEXT,
    ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE OR REPLACE PROCEDURE inventory.sp_get_sales_orders(
    IN  p_data   JSONB,
    INOUT o_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, public
AS $$
DECLARE
    v_company_id BIGINT := (p_data->>'company_id')::BIGINT;
    v_status     TEXT   := NULLIF(TRIM(p_data->>'status'), '');
    v_segment_id BIGINT := NULLIF(p_data->>'segment_id', '')::BIGINT;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'doc_number', s.doc_number,
            'doc_date', s.doc_date,
            'due_date', s.due_date,
            'delivery_date', s.delivery_date,
            'segment_id', s.segment_id,
            'segment_name', s.segment_name,
            'customer_id', s.customer_id,
            'customer_name', s.customer_name,
            'payment_terms', s.payment_terms,
            'delivery_location', s.delivery_location,
            'reference_no', s.reference_no,
            'remarks', s.remarks,
            'status', s.status,
            'created_at', s.created_at,
            'items', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', i.id,
                    'sno', i.sno,
                    'product_id', i.product_id,
                    'product_name', i.product_name,
                    'product_code', i.product_code,
                    'variant_id', i.variant_id,
                    'variant_name', i.variant_name,
                    'uom_id', i.uom_id,
                    'uom_name', i.uom_name,
                    'attribute_name', i.attribute_name,
                    'attribute_value', i.attribute_value,
                    'qty', i.qty,
                    'rate', i.rate,
                    'discount_pct', i.discount_pct,
                    'gst_rate', i.gst_rate,
                    'amount', i.amount,
                    'batch_no', i.batch_no,
                    'serial_no', i.serial_no,
                    'expiry_date', i.expiry_date,
                    'remarks', i.remarks
                ) ORDER BY i.sno), '[]'::jsonb)
                FROM inventory.inv_sales_order_items i WHERE i.so_id = s.id
            )
        ) ORDER BY s.created_at DESC
    ), '[]'::jsonb)
    INTO o_result
    FROM inventory.inv_sales_orders s
    WHERE s.company_id = v_company_id
      AND (v_status IS NULL OR s.status = v_status)
      AND (v_segment_id IS NULL OR s.segment_id = v_segment_id);
END;
$$;

CREATE OR REPLACE PROCEDURE inventory.sp_save_sales_order(
    IN  p_data   JSONB,
    INOUT o_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, public
AS $$
DECLARE
    v_id          BIGINT := NULLIF(p_data->>'id', '')::BIGINT;
    v_company_id  BIGINT := (p_data->>'company_id')::BIGINT;
    v_doc_number  TEXT;
    v_status      TEXT;
    v_so_id       BIGINT;
    v_item        JSONB;
BEGIN
    IF v_id IS NOT NULL AND v_id > 0 THEN
        UPDATE inventory.inv_sales_orders SET
            doc_date          = COALESCE(NULLIF(p_data->>'doc_date','')::DATE, doc_date),
            due_date          = NULLIF(p_data->>'due_date','')::DATE,
            delivery_date     = NULLIF(p_data->>'delivery_date','')::DATE,
            segment_id        = NULLIF(p_data->>'segment_id','')::BIGINT,
            segment_name      = NULLIF(p_data->>'segment_name',''),
            customer_id       = NULLIF(p_data->>'customer_id','')::BIGINT,
            customer_name     = NULLIF(p_data->>'customer_name',''),
            customer_gstin    = NULLIF(p_data->>'customer_gstin',''),
            payment_terms     = NULLIF(p_data->>'payment_terms',''),
            delivery_location = NULLIF(p_data->>'delivery_location',''),
            reference_no      = NULLIF(p_data->>'reference_no',''),
            remarks           = NULLIF(p_data->>'remarks',''),
            status            = COALESCE(NULLIF(p_data->>'status',''), status),
            updated_at        = now()
        WHERE id = v_id AND company_id = v_company_id
        RETURNING id, doc_number, status INTO v_so_id, v_doc_number, v_status;
    ELSE
        v_doc_number := COALESCE(
            NULLIF(TRIM(p_data->>'doc_number'), ''),
            inventory.fn_next_sales_doc_number(v_company_id, 'SO', 'inv_sales_orders')
        );

        INSERT INTO inventory.inv_sales_orders (
            company_id, doc_number, doc_date, due_date, delivery_date, segment_id, segment_name,
            customer_id, customer_name, customer_gstin, payment_terms,
            delivery_location, reference_no, remarks, status
        ) VALUES (
            v_company_id, v_doc_number,
            COALESCE(NULLIF(p_data->>'doc_date','')::DATE, CURRENT_DATE),
            NULLIF(p_data->>'due_date','')::DATE,
            NULLIF(p_data->>'delivery_date','')::DATE,
            NULLIF(p_data->>'segment_id','')::BIGINT, NULLIF(p_data->>'segment_name',''),
            NULLIF(p_data->>'customer_id','')::BIGINT, NULLIF(p_data->>'customer_name',''),
            NULLIF(p_data->>'customer_gstin',''), NULLIF(p_data->>'payment_terms',''),
            NULLIF(p_data->>'delivery_location',''), NULLIF(p_data->>'reference_no',''),
            NULLIF(p_data->>'remarks',''), COALESCE(NULLIF(p_data->>'status',''), 'draft')
        ) RETURNING id, status INTO v_so_id, v_status;
    END IF;

    IF p_data ? 'items' AND jsonb_typeof(p_data->'items') = 'array' THEN
        DELETE FROM inventory.inv_sales_order_items WHERE so_id = v_so_id;
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_data->'items')
        LOOP
            INSERT INTO inventory.inv_sales_order_items (
                so_id, sno, product_id, product_name, product_code,
                variant_id, variant_name, uom_id, uom_name, attribute_name, attribute_value,
                qty, rate, discount_pct, gst_rate, amount,
                batch_no, serial_no, expiry_date, remarks
            ) VALUES (
                v_so_id, COALESCE((v_item->>'sno')::INT, 1),
                NULLIF(v_item->>'product_id','')::BIGINT, COALESCE(v_item->>'product_name',''),
                NULLIF(v_item->>'product_code',''),
                NULLIF(v_item->>'variant_id','')::BIGINT, NULLIF(v_item->>'variant_name',''),
                NULLIF(v_item->>'uom_id','')::BIGINT, NULLIF(v_item->>'uom_name',''),
                NULLIF(v_item->>'attribute_name',''), NULLIF(v_item->>'attribute_value',''),
                COALESCE((v_item->>'qty')::NUMERIC, 0), COALESCE((v_item->>'rate')::NUMERIC, 0),
                COALESCE((v_item->>'discount_pct')::NUMERIC, 0), COALESCE((v_item->>'gst_rate')::NUMERIC, 0),
                COALESCE((v_item->>'amount')::NUMERIC, 0),
                NULLIF(v_item->>'batch_no',''), NULLIF(v_item->>'serial_no',''),
                NULLIF(v_item->>'expiry_date','')::DATE, NULLIF(v_item->>'remarks','')
            );
        END LOOP;
    END IF;

    CALL inventory.sp_get_sales_orders(jsonb_build_object('company_id', v_company_id), o_result);

    SELECT COALESCE(item, '{}'::jsonb)
      INTO o_result
      FROM jsonb_array_elements(o_result) item
     WHERE (item->>'id')::BIGINT = v_so_id
     LIMIT 1;
END;
$$;

CREATE OR REPLACE PROCEDURE inventory.sp_get_sales_returns(
    IN  p_data   JSONB,
    INOUT o_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, public
AS $$
DECLARE
    v_company_id BIGINT := (p_data->>'company_id')::BIGINT;
    v_status     TEXT   := NULLIF(TRIM(p_data->>'status'), '');
    v_segment_id BIGINT := NULLIF(p_data->>'segment_id', '')::BIGINT;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'return_number', r.return_number,
        'return_date', r.return_date,
        'segment_id', r.segment_id,
        'segment_name', r.segment_name,
        'customer_id', r.customer_id,
        'customer_name', r.customer_name,
        'invoice_id', r.invoice_id,
        'invoice_number', r.invoice_number,
        'credit_note_ref', r.credit_note_ref,
        'return_to_warehouse_id', r.return_to_warehouse_id,
        'return_to_warehouse_name', r.return_to_warehouse_name,
        'return_reason', r.return_reason,
        'remarks', r.remarks,
        'subtotal', r.subtotal,
        'tax_amount', r.tax_amount,
        'total_amount', r.total_amount,
        'status', r.status,
        'created_at', r.created_at,
        'items', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', i.id,
                'sno', i.sno,
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
                'invoiced_qty', i.invoiced_qty,
                'return_qty', i.return_qty,
                'rate', i.rate,
                'gst_rate', i.gst_rate,
                'taxable_amount', i.taxable_amount,
                'tax_amount', i.tax_amount,
                'return_amount', i.return_amount,
                'batch_no', i.batch_no,
                'serial_no', i.serial_no,
                'expiry_date', i.expiry_date,
                'reason', i.reason
            ) ORDER BY i.sno), '[]'::jsonb)
              FROM inventory.inv_sales_return_items i
             WHERE i.return_id = r.id
        )
    ) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO o_result
    FROM inventory.inv_sales_returns r
    WHERE r.company_id = v_company_id
      AND (v_status IS NULL OR r.status = v_status)
      AND (v_segment_id IS NULL OR r.segment_id = v_segment_id);
END;
$$;

CREATE OR REPLACE PROCEDURE inventory.sp_save_sales_return(
    IN  p_data   JSONB,
    INOUT o_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = inventory, public
AS $$
DECLARE
    v_id          BIGINT := NULLIF(p_data->>'id', '')::BIGINT;
    v_company_id  BIGINT := (p_data->>'company_id')::BIGINT;
    v_segment_id  BIGINT := NULLIF(p_data->>'segment_id', '')::BIGINT;
    v_result_id   BIGINT;
    v_return_no   TEXT;
    v_item        JSONB;
    v_sno         INT := 1;
    v_subtotal    NUMERIC(14,2) := 0;
    v_tax_amount  NUMERIC(14,2) := 0;
    v_prev_status TEXT;
BEGIN
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id is required';
    END IF;

    IF v_id IS NULL THEN
        v_return_no := COALESCE(
            NULLIF(TRIM(p_data->>'return_number'), ''),
            inventory.fn_next_sales_doc_number(v_company_id, 'SRET', 'inv_sales_returns')
        );

        INSERT INTO inventory.inv_sales_returns
            (company_id, return_number, return_date, segment_id, segment_name,
             customer_id, customer_name, invoice_id, invoice_number, credit_note_ref,
             return_to_warehouse_id, return_to_warehouse_name, return_reason, remarks,
             status, created_by, updated_by)
        VALUES (
            v_company_id, v_return_no,
            COALESCE(NULLIF(p_data->>'return_date', '')::DATE, CURRENT_DATE),
            v_segment_id, NULLIF(TRIM(p_data->>'segment_name'), ''),
            NULLIF(p_data->>'customer_id', '')::BIGINT,
            NULLIF(TRIM(p_data->>'customer_name'), ''),
            NULLIF(p_data->>'invoice_id', '')::BIGINT,
            NULLIF(TRIM(p_data->>'invoice_number'), ''),
            NULLIF(TRIM(p_data->>'credit_note_ref'), ''),
            NULLIF(p_data->>'return_to_warehouse_id', '')::BIGINT,
            NULLIF(TRIM(p_data->>'return_to_warehouse_name'), ''),
            NULLIF(TRIM(p_data->>'return_reason'), ''),
            NULLIF(TRIM(p_data->>'remarks'), ''),
            COALESCE(NULLIF(TRIM(p_data->>'status'), ''), 'draft'),
            NULLIF(p_data->>'user_id', '')::BIGINT,
            NULLIF(p_data->>'user_id', '')::BIGINT
        ) RETURNING id INTO v_result_id;
        v_prev_status := NULL;
    ELSE
        SELECT status
          INTO v_prev_status
          FROM inventory.inv_sales_returns
         WHERE id = v_id AND company_id = v_company_id;

        UPDATE inventory.inv_sales_returns SET
            return_date              = COALESCE(NULLIF(p_data->>'return_date', '')::DATE, return_date),
            segment_id               = COALESCE(v_segment_id, segment_id),
            segment_name             = COALESCE(NULLIF(TRIM(p_data->>'segment_name'), ''), segment_name),
            customer_id              = COALESCE(NULLIF(p_data->>'customer_id', '')::BIGINT, customer_id),
            customer_name            = NULLIF(TRIM(p_data->>'customer_name'), ''),
            invoice_id               = COALESCE(NULLIF(p_data->>'invoice_id', '')::BIGINT, invoice_id),
            invoice_number           = NULLIF(TRIM(p_data->>'invoice_number'), ''),
            credit_note_ref          = NULLIF(TRIM(p_data->>'credit_note_ref'), ''),
            return_to_warehouse_id   = COALESCE(NULLIF(p_data->>'return_to_warehouse_id', '')::BIGINT, return_to_warehouse_id),
            return_to_warehouse_name = NULLIF(TRIM(p_data->>'return_to_warehouse_name'), ''),
            return_reason            = NULLIF(TRIM(p_data->>'return_reason'), ''),
            remarks                  = NULLIF(TRIM(p_data->>'remarks'), ''),
            status                   = COALESCE(NULLIF(TRIM(p_data->>'status'), ''), status),
            updated_at               = now(),
            updated_by               = NULLIF(p_data->>'user_id', '')::BIGINT
        WHERE id = v_id AND company_id = v_company_id
        RETURNING id INTO v_result_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sales Return not found or access denied.';
        END IF;

        DELETE FROM inventory.inv_sales_return_items WHERE return_id = v_result_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'items', '[]'::jsonb))
    LOOP
        DECLARE
            v_return_qty NUMERIC := COALESCE(NULLIF(v_item->>'return_qty', '')::NUMERIC, 0);
            v_rate       NUMERIC := COALESCE(NULLIF(v_item->>'rate', '')::NUMERIC, 0);
            v_gst        NUMERIC := COALESCE(NULLIF(v_item->>'gst_rate', '')::NUMERIC, 0);
            v_taxable    NUMERIC := COALESCE(NULLIF(v_item->>'taxable_amount', '')::NUMERIC, ROUND(v_return_qty * v_rate, 2));
            v_tax        NUMERIC := COALESCE(NULLIF(v_item->>'tax_amount', '')::NUMERIC, ROUND(v_taxable * v_gst / 100, 2));
            v_amt        NUMERIC := COALESCE(NULLIF(v_item->>'return_amount', '')::NUMERIC, ROUND(v_taxable + v_tax, 2));
        BEGIN
            v_subtotal := v_subtotal + v_taxable;
            v_tax_amount := v_tax_amount + v_tax;

            INSERT INTO inventory.inv_sales_return_items
                (return_id, sno, product_id, product_name, product_code,
                 variant_id, variant_name, attribute_id, attribute_name, attribute_value,
                 uom_id, uom_name, invoiced_qty, return_qty, rate, gst_rate,
                 taxable_amount, tax_amount, return_amount, batch_no, serial_no, expiry_date, reason)
            VALUES (
                v_result_id, v_sno,
                NULLIF(v_item->>'product_id', '')::BIGINT,
                TRIM(COALESCE(v_item->>'product_name', '')),
                NULLIF(TRIM(v_item->>'product_code'), ''),
                NULLIF(v_item->>'variant_id', '')::BIGINT,
                NULLIF(TRIM(v_item->>'variant_name'), ''),
                NULLIF(v_item->>'attribute_id', '')::BIGINT,
                NULLIF(TRIM(v_item->>'attribute_name'), ''),
                NULLIF(TRIM(v_item->>'attribute_value'), ''),
                NULLIF(v_item->>'uom_id', '')::BIGINT,
                NULLIF(TRIM(v_item->>'uom_name'), ''),
                COALESCE(NULLIF(v_item->>'invoiced_qty', '')::NUMERIC, 0),
                v_return_qty,
                v_rate,
                v_gst,
                v_taxable,
                v_tax,
                v_amt,
                NULLIF(TRIM(v_item->>'batch_no'), ''),
                NULLIF(TRIM(v_item->>'serial_no'), ''),
                NULLIF(v_item->>'expiry_date', '')::DATE,
                NULLIF(TRIM(v_item->>'reason'), '')
            );
        END;
        v_sno := v_sno + 1;
    END LOOP;

    UPDATE inventory.inv_sales_returns
       SET subtotal = v_subtotal,
           tax_amount = v_tax_amount,
           total_amount = v_subtotal + v_tax_amount
     WHERE id = v_result_id;

    IF COALESCE(NULLIF(TRIM(p_data->>'status'), ''), '') = 'posted'
       AND COALESCE(v_prev_status, '') <> 'posted' THEN
        PERFORM inventory.fn_post_sales_return_stock(v_result_id, v_company_id);
        UPDATE inventory.inv_sales_returns
           SET status = 'posted'
         WHERE id = v_result_id;
    END IF;

    CALL inventory.sp_get_sales_returns(
        jsonb_build_object('company_id', v_company_id, 'segment_id', v_segment_id),
        o_result
    );

    SELECT COALESCE(item, '{}'::jsonb)
      INTO o_result
      FROM jsonb_array_elements(o_result) item
     WHERE (item->>'id')::BIGINT = v_result_id
     LIMIT 1;
END;
$$;
