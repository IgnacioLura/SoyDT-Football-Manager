using System;
using System.Runtime.InteropServices;

var ptr = Native.simulate_spike_match("Nacional", "Penarol");
var result = Marshal.PtrToStringAnsi(ptr);
Console.WriteLine(result);
Native.free_spike_string(ptr);

internal static class Native
{
    [DllImport("ffi_spike.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern IntPtr simulate_spike_match(string homeName, string awayName);

    [DllImport("ffi_spike.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern void free_spike_string(IntPtr s);
}
