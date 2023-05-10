import Image from "next/image";
import styles from "./page.module.css";
import { Month } from "./components/Month";
import { Controls } from "./components/Controls";
import { Stopwatch } from "./components/Stopwatch";

export default function Home() {
  return (
    <main className={styles.main}>
      <Controls />
      <Stopwatch />
      <Month />
    </main>
  );
}
