import styles from "./page.module.css";
import { Month } from "./components/Month";
import { Settings } from "./components/Settings";
import { Stopwatch } from "./components/Stopwatch";

export default function Home() {
  return (
    <main className={styles.main}>
      <Settings />
      <Stopwatch />
      <Month />
    </main>
  );
}
