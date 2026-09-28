using System; using System.IO; using System.Collections.Generic; using System.Text;
namespace Veylix.Licensing {
  static class Harness {
    static int Main() {
      int bad = 0, n = 0;
      foreach (string line in File.ReadAllLines("vectors.tsv")) {
        if (line.Length == 0) continue;
        string[] f = line.Split('\t'); n++;
        bool expect = f[2] == "1";
        if (Hardware.Same(f[0], f[1]) != expect) { bad++; if (bad < 5) Console.WriteLine("MISMATCH " + line); }
      }
      Console.WriteLine("C# vs TS: " + (n - bad) + "/" + n + " identical");
      // Synthetic SMBIOS table: type 1 (uuid), type 2 (board serial "MB-1234"), type 4 (cpu id), type 127.
      var t = new List<byte>();
      // type 1, len 0x1B, handle, strings idx... uuid at +8
      var s1 = new byte[0x1B]; s1[0] = 1; s1[1] = 0x1B; for (int i = 0; i < 16; i++) s1[8 + i] = (byte)(0x10 + i);
      t.AddRange(s1); t.AddRange(Encoding.ASCII.GetBytes("Vendor\0")); t.Add(0);
      var s2 = new byte[0x0F]; s2[0] = 2; s2[1] = 0x0F; s2[4] = 1; s2[5] = 2; s2[6] = 3; s2[7] = 2; // serial = string 2
      t.AddRange(s2); t.AddRange(Encoding.ASCII.GetBytes("ASUS\0MB-1234\0Ver\0")); t.Add(0);
      var s4 = new byte[0x2A]; s4[0] = 4; s4[1] = 0x2A; for (int i = 0; i < 8; i++) s4[8 + i] = (byte)(0xA0 + i);
      t.AddRange(s4); t.Add(0); t.Add(0); // no strings
      t.AddRange(new byte[] { 127, 4, 0, 0, 0, 0 });
      var raw = new List<byte> { 0, 3, 4, 0 }; raw.AddRange(BitConverter.GetBytes(t.Count)); raw.AddRange(t);
      string uuid, board, cpu; Hardware.ParseSmbios(raw.ToArray(), out uuid, out board, out cpu);
      Console.WriteLine("smbios uuid=" + uuid + " board=" + board + " cpu=" + cpu);
      bool ok = uuid == "101112131415161718191a1b1c1d1e1f" && board == "MB-1234" && cpu == "a0a1a2a3a4a5a6a7";
      Console.WriteLine(ok ? "SMBIOS parse OK" : "SMBIOS parse FAIL");
      return bad == 0 && ok ? 0 : 1;
    }
  }
}
