"""
Curriculum definition for Jabalpur Engineering College (JEC).
Defines all expected subjects (name, code) per branch and semester.
"""

import logging

from django.db import DatabaseError

logger = logging.getLogger(__name__)

ORDINALS = {
    1: 'first',
    2: 'second',
    3: 'third',
    4: 'fourth',
    5: 'fifth',
    6: 'sixth',
    7: 'seventh',
    8: 'eighth',
}

SUBJECTS = {   'AIDS': {   'eighth': [   ['Professional Elective Course-III', 'AI801M'],
                              ['Open Elective Course-IV', 'AI802M']],
                'fifth': [   ['Professional Elective Course-1', 'AI51'],
                             ['Deep Learning', 'AI52'],
                             ['Data Science', 'AI53'],
                             ['Digital & Wireless Communication', 'AI54'],
                             ['Professional Ethics', 'BT51']],
                'fourth': [   ['Discrete Structure', 'MA41'],
                              ['Introduction to AI & ML', 'AI42'],
                              ['Data Base Management System', 'AI43'],
                              ['Operating System', 'AI44'],
                              ['Microprocessor & Microcontroller', 'AI45']],
                'seventh': [   ['Big Data Analysis', 'AI701M'],
                               ['Digital Image Processing', 'AI702M'],
                               ['Statistical Data Analysis', 'AI703M'],
                               ['Professional Elective Course-II', 'AI704M'],
                               ['Open Elective Course-III', 'AI705M']],
                'sixth': [   ['Professional Elective Course-II', 'AI61'],
                             ['Open Elective Course-I', 'AI62'],
                             ['Compiler Design', 'AI63'],
                             ['Internet of Things (I.O.T.)', 'AI64'],
                             ['Robotics Technology', 'AI65']],
                'third': [   ['Mathematics-III', 'MA33'],
                             ['Energy & Environmental Engineering', 'CH32'],
                             ['Data Structure and Algorithm', 'AI33'],
                             ['Object Oriented Programming Using JAVA', 'AI34'],
                             [   'Digital Logic Design & Computer Organization',
                                 'AI35']]},
    'CE': {   'eighth': [   ['Professional Elective Course-III', 'CE801M'],
                            ['Open Elective Course-IV', 'CE802M']],
              'fifth': [   ['Professional Elective Course-l', 'CE51'],
                           ['Structural Analysis-1', 'CE52'],
                           ['Geotechnical Engineering-II', 'CE53'],
                           ['Structural Design & Drawing-1 (RCC)', 'CE54'],
                           ['Engineering Economics & Management', 'BT52']],
              'fourth': [   ['Concrete Technology', 'CE41'],
                            ['Transportation Engineering', 'CE42'],
                            ['Geotechnical Engineering-I', 'CE43'],
                            ['Fluid Mechanics', 'CE44'],
                            ['Advance Surveying', 'CE45']],
              'seventh': [   ['Environmental Engg.-II', 'CE701M'],
                             [   'Structural Design & Drawing-III (RCC)',
                                 'CE702M'],
                             ['Estimation Costing & Tendering', 'CE703M'],
                             ['Professional Elective Course-II', 'CE704M'],
                             ['Open Elective Course-III', 'CE705M']],
              'sixth': [   ['Professional Elective Course-II', 'CE61'],
                           ['Open Elective Course-I', 'CE62'],
                           ['Structural Analysis-II', 'CE63'],
                           ['Structural Design & Drawing-II (Steel)', 'CE64'],
                           ['Environmental Engineering-I', 'CE65']],
              'third': [   ['Mathematics-III', 'MA31'],
                           ['Energy & Environmental Engineering', 'CH32'],
                           ['Strength of Material', 'CE33'],
                           ['Engineering Geology', 'CE34'],
                           ['Building Design and Drawing', 'CE35']]},
    'CSE': {   'eighth': [   ['Professional Elective Course-III', 'CS801M'],
                             ['Open Elective Course-IV', 'CS802M']],
               'fifth': [   ['Professional Elective Course-I', 'CS51'],
                            ['Deep Learning', 'CS52'],
                            ['Operating Systems', 'CS53'],
                            ['Computer Graphics & Multimedia', 'CS54'],
                            ['Professional Ethics', 'BT51']],
               'fourth': [   ['Discrete Structure', 'MA41'],
                             ['Database Management Systems', 'CS42'],
                             ['AI & Machine Learning', 'CS43'],
                             ['Design and Analysis of Algorithms', 'CS44'],
                             [   'Computer Organization and Architecture',
                                 'CS45']],
               'seventh': [   ['Professional Elective Course - III', 'CS71'],
                              ['Open Elective Course - II', 'CS72'],
                              ['Compiler Design', 'CS73'],
                              ['Internet of Things', 'CS74'],
                              ['Computer Vision', 'CS75']],
               'sixth': [   ['Professional Elective Course-II', 'CS61'],
                            ['Open Elective Course-I', 'CS62'],
                            ['Computer Networks', 'CS63'],
                            ['Software Engineering', 'CS64'],
                            ['Cryptography and Network Security', 'CS65']],
               'third': [   ['Mathematics-III', 'MA33'],
                            ['Energy & Environmental Engineering', 'CH32'],
                            ['Data Structures & Algorithms', 'CS33'],
                            ['Object Oriented Programming', 'CS34'],
                            ['Digital Electronics', 'CS35']]},
    'CommonForAllBranches': {   'first': [   ['Engineering Chemistry', 'BT11'],
                                             ['Mathematics-I', 'BT12'],
                                             ['English', 'BT13'],
                                             [   'Basic Electrical and '
                                                 'Electronics Engineering',
                                                 'BT14'],
                                             ['Engineering Graphics', 'BT15'],
                                             ['Mathematics-II', 'BT21'],
                                             ['Engineering Physics', 'BT22'],
                                             [   'Computer Programming and '
                                                 'Problem Solving',
                                                 'BT23'],
                                             [   'Basic Mechanical Engineering',
                                                 'BT24'],
                                             [   'Basic Civil Engineering',
                                                 'BT25']],
                                'second': [   ['Engineering Chemistry', 'BT11'],
                                              ['Mathematics-I', 'BT12'],
                                              ['English', 'BT13'],
                                              [   'Basic Electrical and '
                                                  'Electronics Engineering',
                                                  'BT14'],
                                              ['Engineering Graphics', 'BT15'],
                                              ['Mathematics-II', 'BT21'],
                                              ['Engineering Physics', 'BT22'],
                                              [   'Computer Programming and '
                                                  'Problem Solving',
                                                  'BT23'],
                                              [   'Basic Mechanical '
                                                  'Engineering',
                                                  'BT24'],
                                              [   'Basic Civil Engineering',
                                                  'BT25']]},
    'ECE': {   'eighth': [   ['Professional Elective Course-III', 'EC801M'],
                             ['Open Elective Course-IV', 'EC802M']],
               'fifth': [   ['Professional Elective Course-l', 'EC51'],
                            ['Digital Communication', 'EC52'],
                            ['Linear Control Theory', 'EC53'],
                            [   'Microprocessor, Microcontroller & Embedded '
                                'System',
                                'EC54'],
                            ['Mobile Communication and Networks', 'EC55']],
               'fourth': [   ['Electromagnetic Theory', 'EC41'],
                             ['Analog Integrated Circuits', 'EC42'],
                             ['Digital Circuits & Systems', 'EC43'],
                             ['Analog Communication', 'EC44'],
                             [   'Communication N/W & Transmission Lines',
                                 'EC45']],
               'seventh': [   ['Optical Communication', 'EC701M'],
                              ['CMOS VLSI Design', 'EC702M'],
                              ['Antenna Wave Propagation', 'EC703M'],
                              ['Professional Elective Course-II', 'EC704M'],
                              ['Open Elective Course-III', 'EC705M']],
               'sixth': [   ['Professional Elective Course-II', 'EC61'],
                            ['Open Elective Course-I', 'EC62'],
                            ['Digital Signal Processing', 'EC63'],
                            ['Analog & Digital VLSI Design', 'EC64'],
                            ['Microwave & Radar Engg.', 'EC65']],
               'third': [   ['Mathematics-III', 'MA32'],
                            ['Energy & Environmental Engineering', 'CH32'],
                            ['Electronic Devices & Circuits', 'EC33'],
                            ['Signals & Systems', 'EC34'],
                            ['Network Analysis', 'EC35']]},
    'EE': {   'eighth': [   ['Professional Elective Course-III', 'EE801M'],
                            ['Open Elective Course-IV', 'EE802M']],
              'fifth': [   ['Professional Elective Course-I', 'EE51'],
                           ['Control System', 'EE52'],
                           ['Electrical Machine-II', 'EE53'],
                           ['Power Electronics-I', 'EE54'],
                           ['Power Sysem-II', 'EE55']],
              'fourth': [   ['Electrical Engineering Materials', 'EE41'],
                            ['Electrical Machine-I', 'EE42'],
                            ['Power System-I', 'EE43'],
                            ['Electrical & Electronics Instruments', 'EE44'],
                            ['Electromagnetic Field Theory', 'EE45']],
              'seventh': [   ['High Voltage Engineering', 'EE701M'],
                             ['Electrical Drives', 'EE702M'],
                             ['Power System Control', 'EE703M'],
                             ['Professional Elective Course-II', 'EE704M'],
                             ['Open Elective Course-III', 'EE705M']],
              'sixth': [   ['Professional Elective Course-II', 'EE61'],
                           ['Open Elective Course-I', 'EE62'],
                           ['Microprocessor & Microcontroller', 'EE63'],
                           ['Power Electronics-II', 'EE64'],
                           ['Modern Power System', 'EE65']],
              'third': [   ['Mathematics-III', 'MA32'],
                           ['Energy & Environmental Engineering', 'CH32'],
                           ['Circuit Theory & Network Analysis', 'EE33'],
                           ['Analog & Digital Electronics', 'EE34'],
                           [   'Electrical Measurement & Measuring Instrument',
                               'EE35']]},
    'IP': {   'eighth': [   ['Professional Elective Course-III', 'IP801M'],
                            ['Open Elective Course-IV', 'IP802M']],
              'fifth': [   ['Professional Elective Course-I', 'IP51'],
                           ['Tool Engineering & Machine Tools', 'IP52'],
                           ['Metal Cutting Science', 'IP53'],
                           ['Work Study and Ergonomics', 'IP54'],
                           ['Fluid Mechanics', 'IP55']],
              'fourth': [   ['Engineering Economics and Management', 'BT52'],
                            ['Production Process', 'IP42'],
                            ['Theory of Machines & Mechanisms', 'IP43'],
                            ['Material Science & Metallurgy', 'IP44'],
                            ['Machine Design', 'IP45']],
              'seventh': [   ['Industrial Robotics & Mechatronics', 'IP701M'],
                             ['Industrial Engineering', 'IP702M'],
                             ['Advance Manufacturing Process', 'IP703M'],
                             ['Professional Elective Course-II', 'IP704M'],
                             ['Open Elective Course-III', 'IP705M']],
              'sixth': [   ['Professional Elective Course-II', 'IP61'],
                           ['Open Elective Course-I', 'IP62'],
                           ['Operations Research', 'IP63'],
                           ['Manufacturing Technology', 'IP64'],
                           ['Turbo Machines', 'IP65']],
              'third': [   ['Mathematics-III', 'MA31'],
                           ['Energy & Environmental Engineering', 'CH32'],
                           ['Mechanics of Materials', 'IP33'],
                           ['Machine Drawing & CAD', 'IP34'],
                           ['Thermodynamics', 'IP35']]},
    'IT': {   'eighth': [   ['Professional Elective Course-III', 'IT801M'],
                            ['Open Elective Course-IV', 'IT802M']],
              'fifth': [   ['Professional Elective Course-1', 'IT51'],
                           ['Computer Network', 'IT52'],
                           ['Operating System', 'IT53'],
                           ['Data Base Management System', 'IT54'],
                           ['Internet and Web Technology', 'IT55']],
              'fourth': [   ['Discrete Structure', 'MA41'],
                            ['Analysis and Design of Algorithm', 'IT42'],
                            ['Computer Architecture', 'IT43'],
                            ['Principles of Communication', 'IT44'],
                            [   'System Analysis and Software Engineering',
                                'IT45']],
              'seventh': [   ['Professional Elective Course - III', 'IT71'],
                             ['Open Elective Course - II', 'IT72'],
                             ['Information and Cyber Security', 'IT73'],
                             [   'Introduction to Artificial Intelligence & '
                                 'Machine Learning',
                                 'IT74'],
                             ['Internet of Things', 'IT75']],
              'sixth': [   ['Professional Elective Course-II', 'IT61'],
                           ['Open Elective Course-I', 'IT62'],
                           ['Network Management', 'IT63'],
                           ['Data Mining', 'IT64'],
                           ['Cloud Computing', 'IT65']],
              'third': [   ['Mathematics-III', 'MA33'],
                           ['Energy & Environmental Engineering', 'CH32'],
                           ['Data Structure and Algorithm', 'IT33'],
                           ['Object Oriented Concept on C++', 'IT34'],
                           ['Electronics and Digital Circuits', 'IT35']]},
    'ME': {   'eighth': [   ['Professional Elective Course-III', 'ME801M'],
                            ['Open Elective Course-IV', 'ME802M']],
              'fifth': [   ['Professional Elective Course-I', 'ME51'],
                           ['Internal Combustion Engines', 'ME52'],
                           ['Turbo Machines', 'ME53'],
                           ['Dynamics of Machines', 'ME54'],
                           ['Entrepreneurship & Management Concepts', 'BT53']],
              'fourth': [   ['Energy Conversion Systems', 'ME41'],
                            ['Fluid Mechanics', 'ME42'],
                            ['Machine Drawing & CAD', 'ME43'],
                            ['Kinematics of Machines', 'ME44'],
                            ['Machine Design-I', 'ME45']],
              'seventh': [   ['Refrigeration & Air Conditioning', 'ME701M'],
                             ['Vibration & Noise Control', 'ME702M'],
                             ['Advance Machine Design', 'ME703M'],
                             ['Professional Elective Course-II', 'ME704M'],
                             ['Open Elective Course-III', 'ME705M']],
              'sixth': [   ['Professional Elective Course-II', 'ME61'],
                           ['Open Elective Course-I', 'ME62'],
                           ['Heat and Mass Transfer', 'ME63'],
                           ['Metal Cutting & Machine Tools', 'ME64'],
                           ['Industrial Engineering', 'ME65']],
              'third': [   ['Mathematics-III', 'MA31'],
                           ['Material Science', 'ME32'],
                           ['Mechanics of Materials-I', 'ME33'],
                           ['Manufacturing Process', 'ME34'],
                           ['Thermodynamics', 'ME35']]},
    'MT': {   'eighth': [   ['Professional Elective Course-III', 'MT801M'],
                            ['Open Elective Course-IV', 'MT802M']],
              'fifth': [   ['Professional Elective Course-I', 'MT51'],
                           ['Thermodynamics & Applications', 'MT52'],
                           ['Internet of Things', 'MT53'],
                           ['Analog & Digital Communication', 'MT54'],
                           ['Professional Ethics', 'BT51']],
              'fourth': [   ['Manufacturing Process', 'MT41'],
                            ['Electronic Devices & Circuits', 'MT42'],
                            ['Theory of Machines', 'MT43'],
                            ['Microprocessor & Embedded Systems', 'MT44'],
                            ['Linear Control Theory', 'MT45']],
              'seventh': [   ['Mechatronics System Design', 'MT701M'],
                             ['EV and HV Technology', 'MT702M'],
                             ['AI & ML', 'MT703M'],
                             ['Professional Elective Course-II', 'MT704M'],
                             ['Open Elective Course-III', 'MT705M']],
              'sixth': [   ['Professional Elective Course-II', 'MT61'],
                           ['Open Elective Course-1', 'MT62'],
                           ['Industry 4.0', 'MT63'],
                           ['Data Communication & Computer Networks', 'MT64'],
                           ['Robotics and Automation', 'MT65']],
              'third': [   ['Mathematics-III', 'MA34'],
                           ['Energy & Environmental Engineering', 'CH32'],
                           ['Digital Electronics', 'MT33'],
                           ['Strength of Materials', 'MT34'],
                           ['Electronic Instrumentation & Drives', 'MT35']]}}

def get_expected_subjects(branch: str, semester: int):
    """
    Returns a list of [subject_name, subject_code] for the given branch and semester.
    Queries the Subject model (is_current=True) first, falling back to static SUBJECTS if db is unready.
    """
    try:
        sem_num = int(semester)
    except (ValueError, TypeError):
        return []

    b = (branch or '').strip().upper()

    try:
        from core.models import Subject
        if sem_num <= 2:
            db_subjs = list(
                Subject.objects.filter(
                    branch__in=['CommonForAllBranches', b, 'COMMONFORALLBRANCHES'],
                    semester__in=[1, 2],
                    is_current=True,
                ).values_list('name', 'code')
            )
            seen_codes = set()
            unique_subjs = []
            for name, code in db_subjs:
                c = code.upper()
                if c not in seen_codes:
                    seen_codes.add(c)
                    unique_subjs.append([name, code])
            if unique_subjs:
                return unique_subjs
        else:
            branch_aliases = [b]
            if b == 'CS':
                branch_aliases.append('CSE')
            elif b == 'CSE':
                branch_aliases.append('CS')
            db_subjs = list(
                Subject.objects.filter(
                    branch__in=branch_aliases,
                    semester=sem_num,
                    is_current=True,
                ).values_list('name', 'code')
            )
            if db_subjs:
                return db_subjs
    except DatabaseError as e:
        logger.warning(f"Subject lookup failed, using static curriculum: {e}")

    ord_name = ORDINALS.get(sem_num)
    if not ord_name:
        return []

    if sem_num <= 2:
        return SUBJECTS.get('CommonForAllBranches', {}).get(ord_name, [])

    branch_map = {k.upper(): k for k in SUBJECTS.keys()}
    actual_key = branch_map.get(b)
    if not actual_key and b == 'CS':
        actual_key = 'CSE'
    elif not actual_key and b == 'CSE':
        actual_key = 'CS'
    return SUBJECTS.get(actual_key, {}).get(ord_name, [])


SUBJECT_CODE_TO_NAME = {}
for _branch_data in SUBJECTS.values():
    for _sem_list in _branch_data.values():
        for _name, _code in _sem_list:
            if _code not in SUBJECT_CODE_TO_NAME:
                SUBJECT_CODE_TO_NAME[_code] = _name


def get_subject_name_by_code(code: str, default: str = None) -> str:
    """Returns the readable subject name for a given subject code, checking Subject table first."""
    if not code:
        return default or ""
    clean_code = code.strip().upper()
    try:
        from core.models import Subject
        subj = Subject.objects.filter(code__iexact=clean_code).first()
        if subj:
            return subj.name
    except DatabaseError as e:
        logger.warning(f"Subject lookup failed, using static curriculum: {e}")
    return SUBJECT_CODE_TO_NAME.get(clean_code, default if default is not None else code)


