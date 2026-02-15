const branches = {
  IT: "Information Technology",
  CSE: "Computer Science and Engineering",
  ECE: "Electronics and Telecommunication Engineering",
  EE: "Electrical Engineering",
  CE: "Civil Engineering",
  ME: "Mechanical Engineering",
  IP: "Industrial and Production Engineering",
  AIDS: "Artificial Intelligence and Data Science",
  MT: "Mechatronics Engineering",
};

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const ordinals = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "eighth",
};

const subjects = {
  CommonForAllBranches: {
    first: [
      ["Engineering Chemistry", "BT11"],
      ["Mathematics-I", "BT12"],
      ["English", "BT13"],
      ["Basic Electrical and Electronics Engineering", "BT14"],
      ["Engineering Graphics", "BT15"],
      ["Engineering Physics", "BT12"],
      ["Computer Programming and Problem Solving", "BT23"],
      ["Basic Mechanical Engineering", "BT24"],
      ["Basic Civil Engineering", "BT25"],
    ],
    second: [
      ["Engineering Chemistry", "BT11"],
      ["Mathematics-I", "BT12"],
      ["English", "BT13"],
      ["Basic Electrical and Electronics Engineering", "BT14"],
      ["Engineering Graphics", "BT15"],
      ["Engineering Physics", "BT12"],
      ["Computer Programming and Problem Solving", "BT23"],
      ["Basic Mechanical Engineering", "BT24"],
      ["Basic Civil Engineering", "BT25"],
    ],
  },

  IT: {
    third: [
      ["Mathematics-III", "MA33"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Data Structure and Algorithm", "IT33"],
      ["Object Oriented Concept on C++", "IT34"],
      ["Electronics and Digital Circuits", "IT35"],
    ],
    fourth: [
      ["Discrete Structure", "MA41"],
      ["Analysis and Design of Algorithm", "IT42"],
      ["Computer Architecture", "IT43"],
      ["Principles of Communication", "IT44"],
      ["System Analysis and Software Engineering", "IT45"],
    ],
    fifth: [
      ["Professional Elective Course-1", "IT51"],
      ["Computer Network", "IT52"],
      ["Operating System", "IT53"],
      ["Data Base Management System", "IT54"],
      ["Internet and Web Technology", "IT55"],
    ],
    sixth: [
      ["Professional Elective Course-II", "IT61"],
      ["Open Elective Course-I", "IT62"],
      ["Network Management", "IT63"],
      ["Data Mining", "IT64"],
      ["Cloud Computing", "IT65"],
    ],
    seventh: [
      ["Cloud Computing", "IT701M"],
      ["Information Retrieval", "IT702M"],
      ["Machine Learning", "IT703M"],
      ["Professional Elective Course-II", "IT704M"],
      ["Open Elective Course-III", "IT705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "IT801M"],
      ["Open Elective Course-IV", "IT802M"],
    ],
  },
  CSE: {
    third: [
      ["Mathematics-III", "MA33"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Data Structures & Algorithms", "CS33"],
      ["Object Oriented Programming", "CS34"],
      ["Digital Electronics", "CS35"],
    ],
    fourth: [
      ["Discrete Structure", "MA41"],
      ["Database Management Systems", "CS42"],
      ["AI & Machine Learning", "CS43"],
      ["Design and Analysis of Algorithms", "CS44"],
      ["Computer Organization and Architecture", "CS45"],
    ],
    fifth: [
      ["Professional Elective Course-I", "CS51"],
      ["Deep Learning", "CS52"],
      ["Operating Systems", "CS53"],
      ["Computer Graphics & Multimedia", "CS54"],
      ["Professional Ethics", "BT51"],
    ],
    sixth: [
      ["Professional Elective Course-II", "CS61"],
      ["Open Elective Course-I", "CS62"],
      ["Computer Networks", "CS63"],
      ["Software Engineering", "CS64"],
      ["Cryptography and Network Security", "CS65"],
    ],
    seventh: [
      ["Computer Vision", "CS701M"],
      ["Compiler Design", "CS702M"],
      ["Cryptography & Network Security", "CS703M"],
      ["Professional Elective Course-II", "CS704M"],
      ["Open Elective Course-III", "CS705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "CS801M"],
      ["Open Elective Course-IV", "CS802M"],
    ],
  },
  ECE: {
    third: [
      ["Mathematics-III", "MA32"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Electronic Devices & Circuits", "EC33"],
      ["Signals & Systems", "EC34"],
      ["Network Analysis", "EC35"],
    ],
    fourth: [
      ["Electromagnetic Theory", "EC41"],
      ["Analog Integrated Circuits", "EC42"],
      ["Digital Circuits & Systems", "EC43"],
      ["Analog Communication", "EC44"],
      ["Communication N/W & Transmission Lines", "EC45"],
    ],
    fifth: [
      ["Professional Elective Course-l", "EC51"],
      ["Digital Communication", "EC52"],
      ["Linear Control Theory", "EC53"],
      ["Microprocessor, Microcontroller & Embedded System", "EC54"],
      ["Mobile Communication and Networks", "EC55"],
    ],
    sixth: [
      ["Professional Elective Course-II", "EC61"],
      ["Open Elective Course-I", "EC62"],
      ["Digital Signal Processing", "EC63"],
      ["Analog & Digital VLSI Design", "EC64"],
      ["Microwave & Radar Engg.", "EC65"],
    ],
    seventh: [
      ["Optical Communication", "EC701M"],
      ["CMOS VLSI Design", "EC702M"],
      ["Antenna Wave Propagation", "EC703M"],
      ["Professional Elective Course-II", "EC704M"],
      ["Open Elective Course-III", "EC705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "EC801M"],
      ["Open Elective Course-IV", "EC802M"],
    ],
  },
  EE: {
    third: [
      ["Mathematics-III", "MA32"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Circuit Theory & Network Analysis", "EE33"],
      ["Analog & Digital Electronics", "EE34"],
      ["Electrical Measurement & Measuring Instrument", "EE35"],
    ],
    fourth: [
      ["Electrical Engineering Materials", "EE41"],
      ["Electrical Machine-I", "EE42"],
      ["Power System-I", "EE43"],
      ["Electrical & Electronics Instruments", "EE44"],
      ["Electromagnetic Field Theory", "EE45"],
    ],
    fifth: [
      ["Professional Elective Course-I", "EE51"],
      ["Control System", "EE52"],
      ["Electrical Machine-II", "EE53"],
      ["Power Electronics-I", "EE54"],
      ["Power Sysem-II", "EE55"],
    ],
    sixth: [
      ["Professional Elective Course-II", "EE61"],
      ["Open Elective Course-I", "EE62"],
      ["Microprocessor & Microcontroller", "EE63"],
      ["Power Electronics-II", "EE64"],
      ["Modern Power System", "EE65"],
    ],
    seventh: [
      ["High Voltage Engineering", "EE701M"],
      ["Electrical Drives", "EE702M"],
      ["Power System Control", "EE703M"],
      ["Professional Elective Course-II", "EE704M"],
      ["Open Elective Course-III", "EE705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "EE801M"],
      ["Open Elective Course-IV", "EE802M"],
    ],
  },
  CE: {
    third: [
      ["Mathematics-III", "MA31"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Strength of Material", "CE33"],
      ["Engineering Geology", "CE34"],
      ["Building Design and Drawing", "CE35"],
    ],
    fourth: [
      ["Concrete Technology", "CE41"],
      ["Transportation Engineering", "CE42"],
      ["Geotechnical Engineering-I", "CE43"],
      ["Fluid Mechanics", "CE44"],
      ["Advance Surveying", "CE45"],
    ],
    fifth: [
      ["Professional Elective Course-l", "CE51"],
      ["Structural Analysis-1", "CE52"],
      ["Geotechnical Engineering-II", "CE53"],
      ["Structural Design & Drawing-1 (RCC)", "CE54"],
      ["Engineering Economics & Management", "BT52"],
    ],
    sixth: [
      ["Professional Elective Course-II", "CE61"],
      ["Open Elective Course-I", "CE62"],
      ["Structural Analysis-II", "CE63"],
      ["Structural Design & Drawing-II (Steel)", "CE64"],
      ["Environmental Engineering-I", "CE65"],
    ],
    seventh: [
      ["Environmental Engg.-II", "CE701M"],
      ["Structural Design & Drawing-III (RCC)", "CE702M"],
      ["Estimation Costing & Tendering", "CE703M"],
      ["Professional Elective Course-II", "CE704M"],
      ["Open Elective Course-III", "CE705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "CE801M"],
      ["Open Elective Course-IV", "CE802M"],
    ],
  },
  ME: {
    third: [
      ["Mathematics-III", "MA31"],
      ["Material Science", "ME32"],
      ["Mechanics of Materials-I", "ME33"],
      ["Manufacturing Process", "ME34"],
      ["Thermodynamics", "ME35"],
    ],
    fourth: [
      ["Energy Conversion Systems", "ME41"],
      ["Fluid Mechanics", "ME42"],
      ["Machine Drawing & CAD", "ME43"],
      ["Kinematics of Machines", "ME44"],
      ["Machine Design-I", "ME45"],
    ],
    fifth: [
      ["Professional Elective Course-I", "ME51"],
      ["Internal Combustion Engines", "ME52"],
      ["Turbo Machines", "ME53"],
      ["Dynamics of Machines", "ME54"],
      ["Entrepreneurship & Management Concepts", "BT53"],
    ],
    sixth: [
      ["Professional Elective Course-II", "ME61"],
      ["Open Elective Course-I", "ME62"],
      ["Heat and Mass Transfer", "ME63"],
      ["Metal Cutting & Machine Tools", "ME64"],
      ["Industrial Engineering", "ME65"],
    ],
    seventh: [
      ["Refrigeration & Air Conditioning", "ME701M"],
      ["Vibration & Noise Control", "ME702M"],
      ["Advance Machine Design", "ME703M"],
      ["Professional Elective Course-II", "ME704M"],
      ["Open Elective Course-III", "ME705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "ME801M"],
      ["Open Elective Course-IV", "ME802M"],
    ],
  },
  IP: {
    third: [
      ["Mathematics-III", "MA31"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Mechanics of Materials", "IP33"],
      ["Machine Drawing & CAD", "IP34"],
      ["Thermodynamics", "IP35"],
    ],
    fourth: [
      ["Engineering Economics and Management", "BT52"],
      ["Production Process", "IP42"],
      ["Theory of Machines & Mechanisms", "IP43"],
      ["Material Science & Metallurgy", "IP44"],
      ["Machine Design", "IP45"],
    ],
    fifth: [
      ["Professional Elective Course-I", "IP51"],
      ["Tool Engineering & Machine Tools", "IP52"],
      ["Metal Cutting Science", "IP53"],
      ["Work Study and Ergonomics", "IP54"],
      ["Fluid Mechanics", "IP55"],
    ],
    sixth: [
      ["Professional Elective Course-II", "IP61"],
      ["Open Elective Course-I", "IP62"],
      ["Operations Research", "IP63"],
      ["Manufacturing Technology", "IP64"],
      ["Turbo Machines", "IP65"],
    ],
    seventh: [
      ["Industrial Robotics & Mechatronics", "IP701M"],
      ["Industrial Engineering", "IP702M"],
      ["Advance Manufacturing Process", "IP703M"],
      ["Professional Elective Course-II", "IP704M"],
      ["Open Elective Course-III", "IP705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "IP801M"],
      ["Open Elective Course-IV", "IP802M"],
    ],
  },
  AIDS: {
    third: [
      ["Mathematics-III", "MA33"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Data Structure and Algorithm", "AI33"],
      ["Object Oriented Programming Using JAVA", "AI34"],
      ["Digital Logic Design & Computer Organization", "AI35"],
    ],
    fourth: [
      ["Discrete Structure", "MA41"],
      ["Introduction to AI & ML", "AI42"],
      ["Data Base Management System", "AI43"],
      ["Operating System", "AI44"],
      ["Microprocessor & Microcontroller", "AI45"],
    ],
    fifth: [
      ["Professional Elective Course-1", "AI51"],
      ["Deep Learning", "AI52"],
      ["Data Science", "AI53"],
      ["Digital & Wireless Communication", "AI54"],
      ["Professional Ethics", "BT51"],
    ],
    sixth: [
      ["Professional Elective Course-II", "AI61"],
      ["Open Elective Course-I", "AI62"],
      ["Compiler Design", "AI63"],
      ["Internet of Things (I.O.T.)", "AI64"],
      ["Robotics Technology", "AI65"],
    ],
    seventh: [
      ["Big Data Analysis", "AI701M"],
      ["Digital Image Processing", "AI702M"],
      ["Statistical Data Analysis", "AI703M"],
      ["Professional Elective Course-II", "AI704M"],
      ["Open Elective Course-III", "AI705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "AI801M"],
      ["Open Elective Course-IV", "AI802M"],
    ],
  },
  MT: {
    third: [
      ["Mathematics-III", "MA34"],
      ["Energy & Environmental Engineering", "CH32"],
      ["Digital Electronics", "MT33"],
      ["Strength of Materials", "MT34"],
      ["Electronic Instrumentation & Drives", "MT35"],
    ],
    fourth: [
      ["Manufacturing Process", "MT41"],
      ["Electronic Devices & Circuits", "MT42"],
      ["Theory of Machines", "MT43"],
      ["Microprocessor & Embedded Systems", "MT44"],
      ["Linear Control Theory", "MT45"],
    ],
    fifth: [
      ["Professional Elective Course-I", "MT51"],
      ["Thermodynamics & Applications", "MT52"],
      ["Internet of Things", "MT53"],
      ["Analog & Digital Communication", "MT54"],
      ["Professional Ethics", "BT51"],
    ],
    sixth: [
      ["Professional Elective Course-II", "MT61"],
      ["Open Elective Course-1", "MT62"],
      ["Industry 4.0", "MT63"],
      ["Data Communication & Computer Networks", "MT64"],
      ["Robotics and Automation", "MT65"],
    ],
    seventh: [
      ["Mechatronics System Design", "MT701M"],
      ["EV and HV Technology", "MT702M"],
      ["AI & ML", "MT703M"],
      ["Professional Elective Course-II", "MT704M"],
      ["Open Elective Course-III", "MT705M"],
    ],
    eighth: [
      ["Professional Elective Course-III", "MT801M"],
      ["Open Elective Course-IV", "MT802M"],
    ],
  },
};

const currentYear = new Date().getFullYear();
const previousYears = [];
for (let i = 1; i <= 5; i++) {
  previousYears.push(currentYear - i);
}

const years = [];
for (let i = 0; i <= 1; i++) {
  years.push(currentYear - i);
}
export { branches, subjects, semesters, previousYears, years, ordinals };
