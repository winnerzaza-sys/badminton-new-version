import { type ReactNode } from "react";
import { Button, DatePicker, Form, Input, InputNumber } from "antd";
import dayjs from "dayjs";
import { AppSelect } from "../../components/AppSelect";
import type { SessionConfig } from "./service";
import { CourtNameFields } from "../../components/CourtNameFields";

export function PlaySettings({
  config,
  setConfig,
  generate,
  busy,
  selectedCount,
  children,
}: {
  config: SessionConfig;
  setConfig: React.Dispatch<React.SetStateAction<SessionConfig>>;
  generate: () => Promise<void>;
  busy: boolean;
  selectedCount: number;
  children: ReactNode;
}) {
  const [form] = Form.useForm<SessionConfig>();
  const required = [{ required: true, message: "กรุณาระบุข้อมูล" }];
  return (
    <Form
      form={form}
      layout="vertical"
      className="setup-form"
      initialValues={config}
      onValuesChange={(changed, values) => {
        // Persist complete valid draft values; incomplete fields stay in the form.
        const next = {
          ...config,
          ...Object.fromEntries(
            Object.entries(values).filter(
              ([, v]) => v !== null && v !== undefined && v !== "",
            ),
          ),
        };
        if (changed.durationMinutes) {
          next.plannedRounds = Number(changed.durationMinutes) / 10;
          form.setFieldValue("plannedRounds", next.plannedRounds);
        }
        setConfig({
          ...next,
          durationMinutes: Number(next.durationMinutes),
          courtCount: Number(next.courtCount) as 1 | 2,
        });
      }}
      onFinish={() => generate()}
    >
      <section className="panel play-settings">
        <div className="panel-title">
          <h2>ตั้งค่าการเล่น</h2>
          <span className="badge">{config.durationMinutes / 60} ชั่วโมง</span>
        </div>
        <div className="config-grid">
          <Form.Item
            label="วันที่"
            name="date"
            rules={required}
            getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
            normalize={(value) => value?.format("YYYY-MM-DD") ?? ""}
          >
            <DatePicker
              format="DD/MM/YYYY"
              aria-label="วันที่"
              inputReadOnly
              classNames={{ popup: { root: "courtside-picker-popup" } }}
            />
          </Form.Item>
          <Form.Item label="เริ่มเล่น" name="startTime" rules={required}>
            <Input type="time" aria-label="เริ่มเล่น" />
          </Form.Item>
          <Form.Item label="ระยะเวลา" name="durationMinutes" rules={required}>
            <AppSelect
              value={config.durationMinutes}
              onChange={() => {}}
              aria-label="ระยะเวลา"
            >
              <option value={60}>1 ชั่วโมง</option>
              <option value={90}>1.5 ชั่วโมง</option>
              <option value={120}>2 ชั่วโมง</option>
            </AppSelect>
          </Form.Item>
          <Form.Item label="สนาม" name="courtCount" rules={required}>
            <AppSelect
              value={config.courtCount}
              onChange={() => {}}
              aria-label="สนาม"
            >
              <option value={1}>1 สนาม</option>
              <option value={2}>2 สนาม</option>
            </AppSelect>
          </Form.Item>
          <Form.Item
            label="แต้ม / เกม"
            name="pointsPerGame"
            rules={[
              ...required,
              { type: "number", min: 1, max: 99, message: "ระบุ 1–99 แต้ม" },
            ]}
          >
            <InputNumber
              min={1}
              max={99}
              precision={0}
              aria-label="แต้ม / เกม"
            />
          </Form.Item>
          <Form.Item
            label="จำนวนรอบ"
            name="plannedRounds"
            rules={[
              ...required,
              { type: "number", min: 1, max: 30, message: "ระบุ 1–30 รอบ" },
            ]}
          >
            <InputNumber min={1} max={30} precision={0} aria-label="จำนวนรอบ" />
          </Form.Item>
        </div>
        <CourtNameFields
          courtCount={config.courtCount}
          names={config.courtNames}
          disabled={busy}
          onChange={(courtNames) =>
            setConfig((current) => ({ ...current, courtNames }))
          }
        />
      </section>
      {children}
      <div className="generate-footer">
        <div>
          <strong>
            {selectedCount} คน · {config.courtCount} สนาม ·{" "}
            {config.plannedRounds} รอบ
          </strong>
          <small>ตารางทั้งช่วงเวลา ไม่ต้องกดจบทีละเกม</small>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          loading={busy}
          disabled={selectedCount < config.courtCount * 4}
        >
          ✧ สร้างตาราง
        </Button>
      </div>
    </Form>
  );
}
