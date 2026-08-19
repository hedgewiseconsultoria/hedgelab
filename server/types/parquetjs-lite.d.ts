declare module "parquetjs-lite" {
  class ParquetSchema { constructor(schema: Record<string, unknown>); }
  class ParquetWriter { static openStream(schema: ParquetSchema, stream: NodeJS.WritableStream): Promise<ParquetWriter>; appendRow(row: Record<string, unknown>): Promise<void>; close(): Promise<void>; }
  class ParquetReader { static openBuffer(buffer: Buffer): Promise<ParquetReader>; getCursor(): { next(): Promise<Record<string, unknown> | null> }; close(): Promise<void>; }
  const parquet: { ParquetSchema: typeof ParquetSchema; ParquetWriter: typeof ParquetWriter; ParquetReader: typeof ParquetReader };
  export default parquet;
}
