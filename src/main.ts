/// <reference path="../typings/main.d.ts" />

import * as Promise from "bluebird"

const enum DapCmd {
    DAP_INFO = 0x00,
    DAP_LED = 0x01,
    DAP_CONNECT = 0x02,
    DAP_DISCONNECT = 0x03,
    DAP_TRANSFER_CONFIGURE = 0x04,
    DAP_TRANSFER = 0x05,
    DAP_TRANSFER_BLOCK = 0x06,
    DAP_TRANSFER_ABORT = 0x07,
    DAP_WRITE_ABORT = 0x08,
    DAP_DELAY = 0x09,
    DAP_RESET_TARGET = 0x0a,
    DAP_SWJ_PINS = 0x10,
    DAP_SWJ_CLOCK = 0x11,
    DAP_SWJ_SEQUENCE = 0x12,
    DAP_SWD_CONFIGURE = 0x13,
    DAP_JTAG_SEQUENCE = 0x14,
    DAP_JTAG_CONFIGURE = 0x15,
    DAP_JTAG_IDCODE = 0x16,
    DAP_VENDOR0 = 0x80,
}

const enum Csw {
    CSW_SIZE = 0x00000007,
    CSW_SIZE8 = 0x00000000,
    CSW_SIZE16 = 0x00000001,
    CSW_SIZE32 = 0x00000002,
    CSW_ADDRINC = 0x00000030,
    CSW_NADDRINC = 0x00000000,
    CSW_SADDRINC = 0x00000010,
    CSW_PADDRINC = 0x00000020,
    CSW_DBGSTAT = 0x00000040,
    CSW_TINPROG = 0x00000080,
    CSW_HPROT = 0x02000000,
    CSW_MSTRTYPE = 0x20000000,
    CSW_MSTRCORE = 0x00000000,
    CSW_MSTRDBG = 0x20000000,
    CSW_RESERVED = 0x01000000,

    CSW_VALUE = (CSW_RESERVED | CSW_MSTRDBG | CSW_HPROT | CSW_DBGSTAT | CSW_SADDRINC)
}

const enum DapVal {
    AP_ACC = 1 << 0,
    DP_ACC = 0 << 0,
    READ = 1 << 1,
    WRITE = 0 << 1,
    VALUE_MATCH = 1 << 4,
    MATCH_MASK = 1 << 5
}

const enum Info {
    VENDOR_ID = 0x01,
    PRODUCT_ID = 0x02,
    SERIAL_NUMBER = 0x03,
    CMSIS_DAP_FW_VERSION = 0x04,
    TARGET_DEVICE_VENDOR = 0x05,
    TARGET_DEVICE_NAME = 0x06,
    CAPABILITIES = 0xf0,
    PACKET_COUNT = 0xfe,
    PACKET_SIZE = 0xff
}

const enum Reg {
    DP_0x0 = 0,
    DP_0x4 = 1,
    DP_0x8 = 2,
    DP_0xC = 3,
    AP_0x0 = 4,
    AP_0x4 = 5,
    AP_0x8 = 6,
    AP_0xC = 7,

    IDCODE = Reg.DP_0x0,
    ABORT = Reg.DP_0x0,
    CTRL_STAT = Reg.DP_0x4,
    SELECT = Reg.DP_0x8,

}

const enum ApReg {
    CSW = 0x00,
    TAR = 0x04,
    DRW = 0x0C,
    IDR = 0xFC
}

function apReg(r: ApReg, mode: DapVal) {
    let v = r | mode | DapVal.AP_ACC
    return (4 + ((v & 0x0c) >> 2)) as Reg
}

const enum CortexM {
    // Debug Fault Status Register
    DFSR = 0xE000ED30,
    DFSR_EXTERNAL = (1 << 4),
    DFSR_VCATCH = (1 << 3),
    DFSR_DWTTRAP = (1 << 2),
    DFSR_BKPT = (1 << 1),
    DFSR_HALTED = (1 << 0),

    // Debug Exception and Monitor Control Register
    DEMCR = 0xE000EDFC,
    // DWTENA in armv6 architecture reference manual
    DEMCR_TRCENA = (1 << 24),
    DEMCR_VC_HARDERR = (1 << 10),
    DEMCR_VC_BUSERR = (1 << 8),
    DEMCR_VC_CORERESET = (1 << 0),

    // Debug Core Register Selector Register
    DCRSR = 0xE000EDF4,
    DCRSR_REGWnR = (1 << 16),
    DCRSR_REGSEL = 0x1F,

    // Debug Halting Control and Status Register
    DHCSR = 0xE000EDF0,
    C_DEBUGEN = (1 << 0),
    C_HALT = (1 << 1),
    C_STEP = (1 << 2),
    C_MASKINTS = (1 << 3),
    C_SNAPSTALL = (1 << 5),
    S_REGRDY = (1 << 16),
    S_HALT = (1 << 17),
    S_SLEEP = (1 << 18),
    S_LOCKUP = (1 << 19),

    // Debug Core Register Data Register
    DCRDR = 0xE000EDF8,

    // Coprocessor Access Control Register
    CPACR = 0xE000ED88,
    CPACR_CP10_CP11_MASK = (3 << 20) | (3 << 22),

    NVIC_AIRCR = (0xE000ED0C),
    NVIC_AIRCR_VECTKEY = (0x5FA << 16),
    NVIC_AIRCR_VECTRESET = (1 << 0),
    NVIC_AIRCR_SYSRESETREQ = (1 << 2),

    CSYSPWRUPACK = 0x80000000,
    CDBGPWRUPACK = 0x20000000,
    CSYSPWRUPREQ = 0x40000000,
    CDBGPWRUPREQ = 0x10000000,

    TRNNORMAL = 0x00000000,
    MASKLANE = 0x00000f00,

    DBGKEY = (0xA05F << 16),

    // FPB (breakpoint)
    FP_CTRL = (0xE0002000),
    FP_CTRL_KEY = (1 << 1),
    FP_COMP0 = (0xE0002008),

    // DWT (data watchpoint & trace)
    DWT_CTRL = 0xE0001000,
    DWT_COMP_BASE = 0xE0001020,
    DWT_MASK_OFFSET = 4,
    DWT_FUNCTION_OFFSET = 8,
    DWT_COMP_BLOCK_SIZE = 0x10,
}

function bank(addr: number) {
    const APBANKSEL = 0x000000f0
    return (addr & APBANKSEL) | (addr & 0xff000000)
}

let HID = require('node-hid');
let devices = HID.devices()

function error(msg: string): any {
    throw new Error(msg);
}

function info(msg: string) {
   // console.log(msg)
}

function addInt32(arr: number[], val: number) {
    if (!arr) arr = []
    arr.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff)
    return arr
}

function hex(v: number) {
    return "0x" + v.toString(16)
}

function rid(v: number) {
    let m = [
        "DP_0x0",
        "DP_0x4",
        "DP_0x8",
        "DP_0xC",
        "AP_0x0",
        "AP_0x4",
        "AP_0x8",
        "AP_0xC",
    ]

    return m[v] || "?"
}

export class Dap {
    dev: any;

    private dataCb: (v: Buffer) => void;

    constructor(path: string) {
        this.dev = new HID.HID(path)

        this.dev.on("data", (buf: Buffer) => {
            let f = this.dataCb
            this.dataCb = null
            if (f) {
                f(buf)
            } else {
                console.log("DROP", buf)
            }
        })

        this.dev.on("error", (err: Error) => {
            console.log(err.message)
        })
    }

    sendNums(lst: number[]) {
        lst.unshift(0)
        while (lst.length < 64)
            lst.push(0)
        this.dev.write(lst)
    }

    readAsync() {
        if (this.dataCb) error("Race in readAsync")
        return new Promise<Buffer>((resolve, reject) => {
            this.dataCb = resolve
        })
    }

    cmd(op: DapCmd, ...args: number[]) {
        args.unshift(op)
        this.sendNums(args)
    }

    cmdNumsAsync(op: DapCmd, args: number[]) {
        args.unshift(op)
        this.sendNums(args)
        return this.readAsync()
            .then(buf => {
                if (buf[0] != op) error(`Bad response for ${op} -> ${buf[0]}`)
                switch (op) {
                    case DapCmd.DAP_CONNECT:
                    case DapCmd.DAP_INFO:
                    case DapCmd.DAP_TRANSFER:
                        break;
                    default:
                        if (buf[1] != 0)
                            error(`Bad status for ${op} -> ${buf[1]}`)
                }
                return buf
            })
    }

    // seems useless
    infoAsync(id: Info) {
        return this.cmdNumsAsync(DapCmd.DAP_INFO, [id])
            .then(buf => {
                if (buf[1] == 0) return null
                switch (id) {
                    case Info.CAPABILITIES:
                    case Info.PACKET_COUNT:
                    case Info.PACKET_SIZE:
                        if (buf[1] == 1) return buf[2]
                        if (buf[1] == 2) return buf[3] << 8 | buf[2]
                }
                return buf.slice(2, buf[1] + 2 - 1).toString("utf8")
            })
    }

    resetTargetAsync() {
        return this.cmdNumsAsync(DapCmd.DAP_RESET_TARGET, [])
    }

    connectAsync() {
        info("Connecting...")
        return this.cmdNumsAsync(DapCmd.DAP_CONNECT, [1])
            .then(buf => {
                if (buf[1] != 1) error("Non SWD")
                // 1MHz
                return this.cmdNumsAsync(DapCmd.DAP_SWJ_CLOCK, addInt32(null, 1000000))
            })
            .then(() => this.cmdNumsAsync(DapCmd.DAP_TRANSFER_CONFIGURE, [0, 0x50, 0, 0, 0]))
            .then(() => this.cmdNumsAsync(DapCmd.DAP_SWD_CONFIGURE, [0]))
            .then(() => info("Connected."))
    }
}

function promiseWhileAsync(fnAsync: () => Promise<boolean>) {
    let loopAsync = (cond: boolean): Promise<void> =>
        cond ? fnAsync().then(loopAsync) : Promise.resolve()
    return loopAsync(true)
}

function promiseIterAsync<T>(elts: T[], f: (v: T) => Promise<void>): Promise<void> {
    let i = 0
    let loop = (): Promise<void> =>
        i >= elts.length ? Promise.resolve()
            : f(elts[i++]).then(loop)
    return loop()
}

function range(n: number) {
    let r: number[] = []
    for (let i = 0; i < n; ++i)r.push(i)
    return r
}

export class Breakpoint {
    constructor(public parent: Device, public index: number) {
    }

    writeAsync(num: number) {
        return this.parent.writeMemAsync(CortexM.FP_COMP0 + this.index * 4, num)
    }
}

function assert(cond: any) {
    if (!cond) {
        throw new Error("assertion failed");
    }
}

export class Device {
    private dpSelect: number;
    private csw: number;
    idcode: number;
    dap: Dap;
    breakpoints: Breakpoint[];

    constructor(path: string) {
        this.dap = new Dap(path)
    }

    initAsync() {
        return this.dap.connectAsync()
            .then(() => this.readDpAsync(Reg.IDCODE))
            .then(n => { this.idcode = n })
            .then(() => this.writeRegAsync(Reg.DP_0x0, 1 << 2)) // clear sticky error
            .then(() => this.writeDpAsync(Reg.SELECT, 0))
            .then(() => this.writeDpAsync(Reg.CTRL_STAT, CortexM.CSYSPWRUPREQ | CortexM.CDBGPWRUPREQ))
            .then(() => {
                let m = CortexM.CDBGPWRUPACK | CortexM.CSYSPWRUPACK
                return promiseWhileAsync(() =>
                    this.readDpAsync(Reg.CTRL_STAT)
                        .then(v => (v & m) != m))
            })
            .then(() => this.writeDpAsync(Reg.CTRL_STAT, CortexM.CSYSPWRUPREQ | CortexM.CDBGPWRUPREQ | CortexM.TRNNORMAL | CortexM.MASKLANE))
            .then(() => this.writeDpAsync(Reg.SELECT, 0))
            .then(() => this.readApAsync(ApReg.IDR))
            .then(() => this.setupFpbAsync())
            .then(() => info("Initialized."))
    }

    writeRegAsync(regId: Reg, val: number) {
        if (val === null) error("bad val")
        info(`writeReg(${rid(regId)}, ${hex(val)})`)
        return this.regOpAsync(regId, val)
            .then(() => {
            })
    }

    readRegAsync(regId: Reg) {
        return this.regOpAsync(regId, null)
            .then(buf => {
                let v = buf.readUInt32LE(3)
                info(`readReg(${rid(regId)}) = ${hex(v)}`)
                return v
            })
    }

    readDpAsync(addr: Reg) {
        return this.readRegAsync(addr)
    }

    readApAsync(addr: ApReg) {
        return this.writeDpAsync(Reg.SELECT, bank(addr))
            .then(() => this.readRegAsync(apReg(addr, DapVal.READ)))
    }

    writeDpAsync(addr: Reg, data: number) {
        if (addr == Reg.SELECT) {
            if (data === this.dpSelect) return Promise.resolve()
            this.dpSelect = data
        }
        return this.writeRegAsync(addr, data)
    }

    writeApAsync(addr: ApReg, data: number) {
        return this.writeDpAsync(Reg.SELECT, bank(addr))
            .then(() => {
                if (addr == ApReg.CSW) {
                    if (data === this.csw) return Promise.resolve()
                    this.csw = data
                }
                return this.writeRegAsync(apReg(addr, DapVal.WRITE), data)
            })
    }

    writeMemAsync(addr: number, data: number) {
        return this.writeApAsync(ApReg.CSW, Csw.CSW_VALUE | Csw.CSW_SIZE32)
            .then(() => this.writeApAsync(ApReg.TAR, addr))
            .then(() => this.writeApAsync(ApReg.DRW, data))
    }

    readMemAsync(addr: number) {
        return this.writeApAsync(ApReg.CSW, Csw.CSW_VALUE | Csw.CSW_SIZE32)
            .then(() => this.writeApAsync(ApReg.TAR, addr))
            .then(() => this.readApAsync(ApReg.DRW))
    }

    haltAsync() {
        return this.writeMemAsync(CortexM.DHCSR, CortexM.DBGKEY | CortexM.C_DEBUGEN | CortexM.C_HALT)
    }

    setFpbEnabledAsync(enabled = true) {
        return this.writeMemAsync(CortexM.FP_CTRL, CortexM.FP_CTRL_KEY | (enabled ? 1 : 0))
    }

    setupFpbAsync() {
        // Reads the number of hardware breakpoints available on the core
        // and disable the FPB (Flash Patch and Breakpoint Unit)
        // which will be enabled when a first breakpoint will be set

        // setup FPB (breakpoint)
        return this.readMemAsync(CortexM.FP_CTRL)
            .then(fpcr => {
                let nb_code = ((fpcr >> 8) & 0x70) | ((fpcr >> 4) & 0xF)
                let nb_lit = (fpcr >> 7) & 0xf
                info(`${nb_code} hardware breakpoints, ${nb_lit} literal comparators`)
                this.breakpoints = range(nb_code).map(i => new Breakpoint(this, i))
                return this.setFpbEnabledAsync(false)
            })
            .then(() => promiseIterAsync(this.breakpoints, b => b.writeAsync(0)))
    }

    readCpuRegisterAsync(no: number) {
        return this.writeMemAsync(CortexM.DCRSR, no)
            .then(() => this.readMemAsync(CortexM.DHCSR))
            .then(v => assert(v & CortexM.S_REGRDY))
            .then(() => this.readMemAsync(CortexM.DCRDR))
    }

    private regOpAsync(regId: Reg, val: number) {
        let request = val === null ? DapVal.READ : DapVal.WRITE
        if (regId < 4)
            request |= DapVal.DP_ACC
        else
            request |= DapVal.AP_ACC
        request |= (regId & 3) << 2
        let sendargs = [0, 1, request]
        addInt32(sendargs, val)
        return this.dap.cmdNumsAsync(DapCmd.DAP_TRANSFER, sendargs)
            .then(buf => {
                if (buf[1] != 1) error("Bad #trans " + buf[1])
                if (buf[2] != 1) error("Bad transfer status " + buf[2])
                return buf
            })
    }

    readIdCodeAsync() {
        return this.readDpAsync(Reg.IDCODE)
    }
}

let mbedId = devices.filter((d: any) => /MBED CMSIS-DAP/.test(d.product))[0]
let d = new Device(mbedId.path)
d.initAsync()
    .then(() => d.readMemAsync(0xead0))
    .then(v => console.log(v))
    .then(() => promiseIterAsync(range(16), k =>
        d.readCpuRegisterAsync(k)
            .then(v => console.log(`r${k} = ${hex(v)}`))))