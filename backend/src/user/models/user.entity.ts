import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	AfterLoad,
	AfterInsert,
	AfterUpdate,
	ManyToMany,
	JoinTable,
	OneToMany,
	ManyToOne
} from "typeorm";

export enum status {
	Connected = 'Connected',
	Disconnected = 'Disconnected',
	InGame = 'InGame',
}

@Entity()
export class User {

	@PrimaryGeneratedColumn()
	id:number;

	@Column()
	username:string;

	@Column("int", {nullable:true})
	intraID:number;

	@Column({nullable:true})
	profilIntraUrl:string;

	@Column("int", { array: true, default: '{}',nullable: true})
	friends: number[];

	@Column("int", { array: true, default: '{}',nullable: true })
	bloqued: number[];

	@Column("int", { array: true, default: '{}', nullable:true})
	friendsRequest: number[];

	@ManyToMany(() => Conversation, conversation => conversation.users)
	conversations: Conversation[];

	@AfterLoad()
	@AfterInsert()
	@AfterUpdate()
	async nullChecks():Promise<void> {
		if (!this.friendsRequest) {
			this.friendsRequest = []
		}
		if (!this.friends) {
			this.friends = []
		}
		if (!this.bloqued) {
			this.bloqued = []
		}
	}
}

@Entity()
export class Conversation {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(() => User, user => user.conversations)
	@JoinTable()
	users: User[];

	@OneToMany(() => Message, message => message.conversation, {cascade: ['insert', 'update']})
	messages: Message[];
}

@Entity()
export class Message {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	idSend: number;

	@Column()
	idRecv: number;

	@Column()
	content: string;

	@Column()
	date: Date;

	@ManyToOne(() => Conversation, conversation => conversation.messages)
	conversation: Conversation;

}
