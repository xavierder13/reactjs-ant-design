import json, random, datetime
random.seed(42)
today = datetime.date.today()
branches = [{"id": i, "name": n} for i, n in enumerate(["ADMINISTRATION","AGOO","BANTAY","URDA-ALEXANDER","APALIT","ROSALES","LAOAG","SANTIAGO","CAUAYAN","ROSARIO","MANGALDAN","SAN JOSE","ROXAS","PENGUE"], start=1)]
positions = [{"id": i, "name": n} for i, n in enumerate(["Sales Staff","Cashier","Account Analyst","Warehouseman","Credit Investigator","Driver"], start=1)]
sources = ["Facebook","Walk-in","JobStreet","Referral","Indeed", ""]
officers = [("Officer A","HR Head"),("Officer B","Branch Manager"),("Officer C","Recruitment Supervisor"),("","")]
def fmt(d): return d.strftime("%m/%d/%Y") if d else None
def progress(r):
    s=r["status"]; ii=r["initial_interview_status"]; iq=r["iq_status"]; bi=r["bi_status"]; fi=r["final_interview_status"]; o=r["orientation_status"]
    if s==0: return "Screening on Process"
    if s==2: return "Not Qualified"
    if s==3: return "Non-Compliant - Screening"
    if s==4: return "Screening - Reserved"
    for val,name in ((ii,"Initial Interview"),(iq,"Exam"),(bi,"B.I & Basic Req"),(fi,"Final Interview")):
        if val==0: return f"{name} on Process"
        if val==2: return f"{name} Failed" if name!="Exam" else "Exam Failed"
        if val==3: return f"Non-Compliant - {name}"
        if name=="Final Interview" and val==4: return "Final Interview - Reserved"
    if o==0 or (fi==1 and o is None): return "Orientation on Process"
    if o==2: return "Orientation Failed"
    if o==3: return "Non-Compliant - Orientation"
    if o==1 and r["signing_of_contract_date"]: return "Hired"
    return None
rows=[]
for i in range(420):
    applied = today - datetime.timedelta(days=random.randint(0, 540))
    r = {"id": i+1, "name": f"Applicant {i+1}" if i % 37 else "", "lastname": "L", "firstname": "F",
         "date_applied": fmt(applied), "created_at": fmt(applied),
         "position_name": random.choice(positions)["name"] if i % 53 else None,
         "branch_applied": random.choice(branches)["name"] if i % 61 else None, "branch_name": random.choice(branches)["name"],
         "gender": random.choice(["Male","Female","Male","Female",""]), "age": str(random.randint(18,60)) if i % 17 else "",
         "how_learn": random.choice(sources), "educ_attain": random.choice(["College Graduate","College Level","Vocational","High School Graduate",""]),
         "civil_status": random.choice(["Single","Married","Widowed",""]),
         "status": None, "initial_interview_status": None, "iq_status": None, "bi_status": None, "final_interview_status": None, "orientation_status": None,
         "screening_date": None, "initial_interview_date": None, "iq_date": None, "bi_date": None, "final_interview_date": None, "orientation_date": None, "signing_of_contract_date": None,
         "employment_position": None, "employment_branch": None, "position_preference": None, "branch_preference": None,
         "hiring_officer_name": None, "hiring_officer_position": None}
    d = applied
    def step(): 
        global d; d = d + datetime.timedelta(days=random.randint(0, 12)); return d if d <= today else today
    r["status"] = random.choices([0,1,2,3,4],[15,60,10,5,10])[0]; r["screening_date"] = fmt(step())
    if r["status"]==1:
        r["initial_interview_status"] = random.choices([0,1,2,3],[10,70,15,5])[0]; r["initial_interview_date"]=fmt(step())
        r["position_preference"] = ",".join(str(random.randint(1,6)) for _ in range(random.randint(1,2))); r["branch_preference"] = ",".join(str(random.randint(1,6)) for _ in range(random.randint(1,2)))
        if r["initial_interview_status"]==1:
            r["iq_status"] = random.choices([0,1,2,3],[10,70,15,5])[0]; r["iq_date"]=fmt(step())
            if r["iq_status"]==1:
                r["bi_status"] = random.choices([0,1,2,3],[10,75,10,5])[0]; r["bi_date"]=fmt(step())
                if r["bi_status"]==1:
                    r["final_interview_status"] = random.choices([0,1,2,3,4],[10,65,15,5,5])[0]; r["final_interview_date"]=fmt(step())
                    if r["final_interview_status"]==1:
                        p = random.choice(positions); b = random.choice(branches)
                        r["employment_position"] = p["name"]; r["employment_branch"] = b["name"]
                        off = random.choice(officers); r["hiring_officer_name"], r["hiring_officer_position"] = off
                        r["orientation_status"] = random.choice([None,0,1,1,1,1,2,3]); r["orientation_date"]=fmt(step())
                        if r["orientation_status"]==1 and random.random() < 0.9: r["signing_of_contract_date"]=fmt(step())
    r["screening_status"] = r["status"]
    r["progress_status"] = progress(r)
    rows.append(r)
json.dump({"job_applicants": rows, "branches": branches, "positions": positions}, open("fixture.json","w"))
print(len(rows), "rows;", sum(1 for r in rows if r["progress_status"]=="Hired"), "hired;", len({r["progress_status"] for r in rows}), "distinct statuses")
